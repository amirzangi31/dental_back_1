import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../../utils/responses";
import { db } from "../../../db";
import { orders, OrderStatus, orderStatusEnum, orderTeeth, orderFiles } from "../../../db/schema/orders";
import {
  independentServicePriceParts,
  insertIndependentLines,
  loadIndependentServicesByOrders,
  quoteIndependentServices,
  resolveIndependentSelection,
  sumIndependentServiceSnapshots,
} from "../independentService/resolveSelection";
import { tooth } from "../../../db/schema/tooth";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { calculateTeethTotalPrice } from "../../../utils/calculateTeethPrice";
import { category } from "../../../db/schema/category";
import { device } from "../../../db/schema/device";
import { materialshade } from "../../../db/schema/materialshade";
import { volume } from "../../../db/schema/volume";
import { color } from "../../../db/schema/color";
import { files } from "../../../db/schema/files";
import {
  generateOrderFormPdfFile,
  getGenderLabel,
  getUserTypeLabel,
  buildFileDownloadUrl,
  buildToothColorLabel,
  DownloadableFile,
} from "../../../utils/orderFormPdf";
import path from "path";
import fs from "fs";
import { zipStoredFiles } from "../../../utils/zipFiles";
import { downloadNameForStoredPath } from "../../../utils/storedFileDownload";
import { vip } from "../../../db/schema/vip";
import { getPagination } from "../../../utils/pagination";
import {
  booleanQuery,
  combineFilters,
  matchesText,
  oneOf,
  readQuery,
  searchText,
} from "../../../utils/listQuery";
import { payment, PaymentStatus, paymentStatusEnum } from "../../../db/schema/payment";
import {
  ensurePendingPayment,
  findOrderPayment,
  isWorkOrderStatus,
  settleUnpaidOrderByAdmin,
} from "../payment/orderPayment";
import { tax } from "../../../db/schema/tax";
import { material } from "../../../db/schema/material";
import { users } from "../../../db/schema/users";
import { tickets, ticketMessages } from "../../../db/schema/ticket";
import { parseDefinedPrice } from "../../../utils/parseDefinedPrice";
import { redesignPrice } from "../../../utils/redesignPrice";
import {
  buildInvoiceMoney,
  FALLBACK_LINE_DESCRIPTION,
  invoicePriceParts,
} from "../invoice/invoiceDocument";
import {
  applyDiscountToBeforeTax,
  billAfterDiscount,
  readDiscountCodeInput,
} from "../discountCode/resolveDiscount";

// The order form sends 0 when no shade or device was chosen. 0 is not a row id.
const optionalForeignKey = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const isRedesignFlag = (value: unknown) =>
  value === true || value === "true" || value === "1" || value === 1;

const patientFullName = (
  first?: string | null,
  last?: string | null,
) => [first, last].map((part) => part?.trim()).filter(Boolean).join(" ") || null;

const finiteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Each volume on the order is a label plus the number the user entered.
const normalizeToothVolumes = (raw: unknown) => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const label = String(record.label ?? record.title ?? "").trim();
    const value = finiteNumber(record.value ?? record.defaultvalue);
    if (!label && value === null) return [];
    return [
      {
        id: finiteNumber(record.id),
        title: label,
        label,
        value,
        defaultvalue: value,
        start: finiteNumber(record.start),
        end: finiteNumber(record.end),
        unit:
          record.unit == null || record.unit === "" ? null : String(record.unit),
        price: finiteNumber(record.price),
      },
    ];
  });
};

const volumeFieldLabel = (
  toothnumber: number | null | undefined,
  volumeItem: { label?: string | null; title?: string | null },
) => {
  const name = String(volumeItem.label || volumeItem.title || "").trim();
  if (!name) return "";
  return toothnumber == null ? name : `دندان ${toothnumber} / ${name}`;
};

const volumeFieldValue = (volumeItem: {
  value?: number | string | null;
  defaultvalue?: number | string | null;
  unit?: string | null;
}) => {
  const numeric = volumeItem.value ?? volumeItem.defaultvalue;
  if (numeric === null || numeric === undefined || numeric === "") return "-";
  const unit =
    typeof volumeItem.unit === "string" && volumeItem.unit.trim()
      ? ` ${volumeItem.unit.trim()}`
      : "";
  return `${numeric}${unit}`;
};

const countUnansweredMessages = (
  messagesNewestFirst: { senderType: string }[],
  mySenderType: string,
  ticketStatus: string | null,
) => {
  if (ticketStatus === "close") return 0;

  let unanswered = 0;
  for (const msg of messagesNewestFirst) {
    if (msg.senderType === mySenderType) break;
    unanswered += 1;
  }
  return unanswered;
};

const loadOrderTickets = async (orderIds: number[], viewerRole?: string) => {
  const map = new Map<
    number,
    {
      id: number;
      orderId: number | null;
      subject: string | null;
      ticketStatus: string | null;
      createdAt: Date | null;
    }[]
  >();
  const messageCount = new Map<number, number>();
  if (!orderIds.length) return { tickets: map, messageCount };

  const rows = await db
    .select({
      id: tickets.id,
      orderId: tickets.orderId,
      subject: tickets.subject,
      ticketStatus: tickets.ticketStatus,
      createdAt: tickets.createdAt,
    })
    .from(tickets)
    .where(inArray(tickets.orderId, orderIds))
    .orderBy(desc(tickets.createdAt));

  for (const row of rows) {
    if (!row.orderId) continue;
    const list = map.get(row.orderId) ?? [];
    list.push(row);
    map.set(row.orderId, list);
  }

  if (rows.length > 0) {
    const mySenderType = viewerRole === "admin" ? "admin" : "user";
    const messages = await db
      .select({
        ticketId: ticketMessages.ticketId,
        senderType: ticketMessages.senderType,
      })
      .from(ticketMessages)
      .where(
        inArray(
          ticketMessages.ticketId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(desc(ticketMessages.id));

    const messagesByTicket = new Map<number, { senderType: string }[]>();
    for (const msg of messages) {
      const thread = messagesByTicket.get(msg.ticketId);
      if (thread) thread.push(msg);
      else messagesByTicket.set(msg.ticketId, [msg]);
    }

    const reportRows = await db
      .select({ id: orders.id, report: orders.report })
      .from(orders)
      .where(inArray(orders.id, orderIds));
    const reportByOrder = new Map(reportRows.map((row) => [row.id, row.report]));

    for (const [orderId, list] of map) {
      const reportId = reportByOrder.get(orderId);
      const ticket =
        (typeof reportId === "number"
          ? list.find((item) => item.id === reportId)
          : undefined) ?? list[0];
      if (!ticket) continue;
      messageCount.set(
        orderId,
        countUnansweredMessages(
          messagesByTicket.get(ticket.id) ?? [],
          mySenderType,
          ticket.ticketStatus,
        ),
      );
    }
  }

  return { tickets: map, messageCount };
};

const orderOwner = alias(users, "order_owner");

const readOrderListFilters = (req: Request) => {
  const status = oneOf(readQuery(req, "status"), orderStatusEnum, "order status");
  if (!status.ok) return status;
  const paymentStatus = oneOf(
    readQuery(req, "paymentStatus"),
    paymentStatusEnum,
    "payment status",
  );
  if (!paymentStatus.ok) return paymentStatus;
  const vip = booleanQuery(readQuery(req, "vip"), "vip filter");
  if (!vip.ok) return vip;

  return {
    ok: true as const,
    q: searchText(req),
    status: status.value,
    paymentStatus: paymentStatus.value,
    vip: vip.value,
  };
};

const materialFileIds = (mat: {
  file?: unknown;
  files?: unknown;
}): number[] => {
  const ids: number[] = [];
  const push = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isInteger(parsed) && parsed > 0 && !ids.includes(parsed)) ids.push(parsed);
  };
  push(mat?.file);
  if (Array.isArray(mat?.files)) mat.files.forEach(push);
  return ids.slice(0, 10);
};

const storedMaterial = (mat: any) => {
  const ids = materialFileIds(mat);
  const file =
    ids[0] ?? (typeof mat?.file === "string" && mat.file.trim() ? mat.file : null);
  return {
    material: mat?.material || null,
    file,
    files: ids,
    text: mat?.text || null,
  };
};

const materialInputIsEmpty = (value: unknown) => {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value === "number") return !Number.isFinite(value) || value <= 0;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as object).length === 0;
  }
  return false;
};

// descriptionStatus decides which inputs exist. inputRequired decides if they must be filled.
const findMissingRequiredMaterialInput = async (
  teeth: Array<{
    materials?: Array<{ material?: unknown; text?: unknown; file?: unknown }>;
  }>,
): Promise<string | null> => {
  const ids = new Set<number>();
  for (const toothItem of teeth) {
    if (!Array.isArray(toothItem.materials)) continue;
    for (const mat of toothItem.materials) {
      const id = Number(mat.material);
      if (Number.isInteger(id) && id > 0) ids.add(id);
    }
  }
  if (ids.size === 0) return null;

  const rows = await db
    .select({
      id: material.id,
      title: material.title,
      descriptionStatus: material.descriptionStatus,
      inputRequired: material.inputRequired,
    })
    .from(material)
    .where(inArray(material.id, [...ids]));

  const byId = new Map(rows.map((row) => [row.id, row]));

  for (const toothItem of teeth) {
    if (!Array.isArray(toothItem.materials)) continue;
    for (const mat of toothItem.materials) {
      const definition = byId.get(Number(mat.material));
      if (!definition?.inputRequired) continue;
      const needsText =
        definition.descriptionStatus === "text" ||
        definition.descriptionStatus === "all";
      const needsFile =
        definition.descriptionStatus === "file" ||
        definition.descriptionStatus === "all";
      if (
        (needsText && materialInputIsEmpty(mat.text)) ||
        (needsFile && materialFileIds(mat).length === 0 && materialInputIsEmpty(mat.file))
      ) {
        return definition.title || String(definition.id);
      }
    }
  }
  return null;
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const {
      title,
      patientname,
      patientlastname,
      patientage,
      patientgender,
      report,
      comment,
      file,
      discount,
      discountCode,
      vip: vipParametr,
      teeth,
      connections,
      antagonists,
      independentServices,
    } = req.body;

    const teethInput = Array.isArray(teeth) ? teeth : [];
    const resolvedServices = await resolveIndependentSelection(independentServices, {
      userId: user?.userId || user?.id,
      requireOwnedFiles: true,
    });
    if (!resolvedServices.ok) {
      return errorResponse(res, 400, resolvedServices.message, null);
    }
    if (teethInput.length === 0 && resolvedServices.lines.length === 0) {
      return errorResponse(res, 400, "ORDER_NEEDS_ITEM", null);
    }

    const missingMaterialInput = teethInput.length
      ? await findMissingRequiredMaterialInput(teethInput)
      : null;
    if (missingMaterialInput) {
      return errorResponse(
        res,
        400,
        `وارد کردن اطلاعات متریال «${missingMaterialInput}» اجباری است`,
        null,
      );
    }

    // ---------- create teeth values & compute prices ----------
    let totalPrice = 0;
    let hasMissingPrice = false;
    const teethValues = teethInput.map((t: any) => {
      const materialsData =
        t.materials && Array.isArray(t.materials)
          ? t.materials.map((mat: any) => storedMaterial(mat))
          : [];

      return {
        toothnumber: +t.toothnumber || null,
        category: +t.category || null,
        device: +t.device || null,
        materialshade: +t.materialshade || null,
        materials: materialsData,
        volume: normalizeToothVolumes(t.volume),
      };
    });

    // Calculate total price: category + materials (without volume)
    for (let i = 0; i < teethInput.length; i++) {
      const t = teethInput[i];
      let toothPrice = 0;

      // Category price
      if (t.category) {
        const [categoryItem] = await db
          .select({ price: category.price })
          .from(category)
          .where(eq(category.id, +t.category))
          .limit(1);

        const categoryPrice = parseDefinedPrice(categoryItem?.price);
        if (categoryPrice === null) {
          hasMissingPrice = true;
        } else {
          toothPrice += categoryPrice;
        }
      } else {
        hasMissingPrice = true;
      }

      // Materials price
      if (t.materials && Array.isArray(t.materials)) {
        for (const mat of t.materials) {
          if (mat.material) {
            const [materialItem] = await db
              .select({ price: material.price })
              .from(material)
              .where(eq(material.id, mat.material))
              .limit(1);

            const materialPrice = parseDefinedPrice(materialItem?.price);
            if (materialPrice === null) {
              hasMissingPrice = true;
            } else {
              toothPrice += materialPrice;
            }
          }
        }
      }

      totalPrice += toothPrice;
    }

    // Get VIP and Tax
    const [taxItem] = await db.select().from(tax);
    const taxPercent = taxItem ? Number(taxItem.percent || 0) : 0;

    const [vipItem] = await db.select().from(vip);
    const vipPercent = vipItem ? Number(vipItem.percent || 0) : 0;

    // Calculate final total: subtotal + VIP% + Tax
    const isVip = vipParametr === "true" || vipParametr === true;
    if (hasMissingPrice) {
      totalPrice = 0;
    } else {
      totalPrice += resolvedServices.subtotal;
    }
    const vipAmount =
      isVip && !hasMissingPrice ? (totalPrice * vipPercent) / 100 : 0;
    const totalBeforeTax = totalPrice + vipAmount;
    const appliedDiscount = await applyDiscountToBeforeTax(
      discountCode,
      hasMissingPrice ? 0 : totalBeforeTax,
      hasMissingPrice ? 0 : taxPercent,
    );
    if (!appliedDiscount.ok) {
      return errorResponse(res, 400, appliedDiscount.message, null);
    }
    const taxAmount = appliedDiscount.taxAmount;
    const finalTotal = hasMissingPrice ? 0 : appliedDiscount.total;

    // ---------- create order, teeth, and independent services ----------
    const createdOrderBundle = await db.transaction(async (tx) => {
      const [createdOrder]: any = await tx
        .insert(orders)
        .values({
          title: title || null,
          user_id: user.userId,
          patientname: patientname || null,
          patientlastname: patientlastname || null,
          patientage: patientage ? parseInt(patientage, 10) : null,
          patientgender: patientgender || null,
          report: report ? parseInt(report, 10) : null,
          status: "payment" as OrderStatus,
          totalaprice: String(finalTotal),
          paymentstatus: false,
          comment: comment || null,
          file: file || null,
          discount: discount ? parseInt(discount, 10) : null,
          discountCode: appliedDiscount.code,
          discountToman: appliedDiscount.discountToman,
          vip: vipParametr === "true" || vipParametr === true || false,
          connections: connections || [],
          antagonists: antagonists || [],
        })
        .returning();

      const createdTeeth = teethValues.length
        ? await tx.insert(tooth).values(teethValues).returning()
        : [];
      const orderTeethData = createdTeeth.map((t) => ({
        orderId: createdOrder.id,
        toothId: t.id,
      }));
      if (orderTeethData.length) await tx.insert(orderTeeth).values(orderTeethData);
      await insertIndependentLines(tx, createdOrder.id, resolvedServices.lines);
      const serviceFileIds = [
        ...new Set(resolvedServices.lines.flatMap((line) => line.fileIds)),
      ];
      if (serviceFileIds.length) {
        await tx
          .insert(orderFiles)
          .values(
            serviceFileIds.map((fileId) => ({
              orderId: createdOrder.id,
              fileId,
              role: "user" as const,
            })),
          )
          .onConflictDoNothing();
      }
      return { createdOrder, createdTeeth };
    });
    const createdOrder = createdOrderBundle.createdOrder;
    const createdTeeth = createdOrderBundle.createdTeeth;

    const teethIds = createdTeeth.map((t) => t.id);

    // ---------- fetch detailed teeth info ----------
    const detailedTeeth = teethIds.length
      ? await db
      .select({
        id: tooth.id,
        toothnumber: tooth.toothnumber,
        category: tooth.category,
        categoryName: category.title,
        categoryPrice: category.price,
        device: tooth.device,
        materialshade: tooth.materialshade,
        materials: tooth.materials,
        volume: tooth.volume,
        colorCode: color.code,
        color: color.id,
      })
      .from(tooth)
      .leftJoin(category, eq(tooth.category, category.id))
      .leftJoin(device, eq(tooth.device, device.id))
      .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
      .leftJoin(color, eq(category.color, color.id))
      .where(inArray(tooth.id, teethIds))
      : [];

    const finalTeeth = await Promise.all(
      detailedTeeth.map(async (t) => {
        let toothTotalPrice = parseDefinedPrice(t.categoryPrice) ?? 0;

        if (t.materials && Array.isArray(t.materials)) {
          for (const mat of t.materials) {
            if (mat.material) {
              const [materialItem] = await db
                .select({ price: material.price })
                .from(material)
                .where(eq(material.id, mat.material))
                .limit(1);

              const materialPrice = parseDefinedPrice(materialItem?.price);
              if (materialPrice !== null) {
                toothTotalPrice += materialPrice;
              }
            }
          }
        }

        return {
          ...t,
          price: toothTotalPrice,
        };
      }),
    );

    // ---------- link attachment files to order ----------
    const attachmentFileIds: number[] = (req as any).attachmentFileIds ?? [];
    let attachmentFileRecords: typeof files.$inferSelect[] = [];

    if (attachmentFileIds.length > 0) {
      await db
        .insert(orderFiles)
        .values(
          attachmentFileIds.map((fileId) => ({
            orderId: createdOrder.id,
            fileId,
            role: "user" as const,
          })),
        )
        .onConflictDoNothing();

      attachmentFileRecords = await db
        .select()
        .from(files)
        .where(inArray(files.id, attachmentFileIds));

      // اگر فایل اصلی سفارش تنظیم نشده، اولین فایل پیوست را به orders.file اضافه کن
      if (!createdOrder.file && attachmentFileRecords.length > 0) {
        await db
          .update(orders)
          .set({ file: attachmentFileRecords[0].path })
          .where(eq(orders.id, createdOrder.id));
        createdOrder.file = attachmentFileRecords[0].path;
      }
    }

    const paymentRow = await ensurePendingPayment(createdOrder.id);
    createdOrder.status = "payment";

    return successResponse(
      res,
      200,
      {
        order: createdOrder,
        teeth: finalTeeth,
        teethIds,
        independentServices: quoteIndependentServices(resolvedServices.lines),
        payment: paymentRow,
        vip: vipAmount || 0,
        vipPercent: vipPercent || 0,
        discountCode: appliedDiscount.code,
        discountToman: appliedDiscount.discountToman,
        files: attachmentFileRecords,
      },
      "Order created successfully",
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getOrderWithId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const [order] = await db.select().from(orders).where(eq(orders.id, +id));

    if (!order) {
      return errorResponse(res, 404, "Order not found", null);
    }
    if (order.user_id !== user.userId && user.role !== "admin") {
      return errorResponse(
        res,
        403,
        "You are not authorized to access this order",
        null,
      );
    }

    const teethRelations = await db
      .select()
      .from(orderTeeth)
      .where(eq(orderTeeth.orderId, order.id));

    const independentServices = (
      await loadIndependentServicesByOrders(db, [order.id])
    ).get(order.id) ?? [];
    if (teethRelations.length === 0 && independentServices.length === 0) {
      return errorResponse(res, 404, "Teeth not found", null);
    }

    const teethIds = teethRelations.map((t) => t.toothId);

    const teethData = teethIds.length
      ? await db
      .select({
        id: tooth.id,
        toothnumber: tooth.toothnumber,
        category: tooth.category,
        haveRedesign: category.haveRedesign,
        categoryName: category.title,
        categoryPrice: category.price,
        device: tooth.device,
        materialshade: tooth.materialshade,
        volume: tooth.volume,
        colorCode: color.code,
        color: color.id,
        materials: tooth.materials,
      })
      .from(tooth)
      .leftJoin(category, eq(tooth.category, category.id))
      .leftJoin(device, eq(tooth.device, device.id))
      .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
      .leftJoin(color, eq(category.color, color.id))
      .where(inArray(tooth.id, teethIds))
      : [];

    // دریافت Tax و VIP
    const [taxItem] = await db.select().from(tax);
    const taxPercent = taxItem ? Number(taxItem.percent || 0) : 0;

    const [vipItem] = await db.select().from(vip);
    const vipPercent = vipItem ? Number(vipItem.percent || 0) : 0;
    const isRedesignQuote =
      order.refrence != null || isRedesignFlag(req.query.redesign);

    // ساخت خروجی مشابه ToothType interface
    const teethDetails: any[] = [];
    let hasMissingPrice = false;
    let subtotal = 0;

    for (const toothData of teethData) {
      // محاسبه قیمت دندان
      let categoryPriceNum = 0;
      let materialsTotal = 0;
      let toothHasMissingPrice = false;

      const parsedCategoryPrice = parseDefinedPrice(toothData.categoryPrice);
      if (parsedCategoryPrice === null) {
        toothHasMissingPrice = true;
        hasMissingPrice = true;
      } else {
        categoryPriceNum = redesignPrice(parsedCategoryPrice, isRedesignQuote , toothData.haveRedesign ?? false);
      }

      // Get materials با جزئیات
      const materialsArray: any[] = [];
      if (toothData.materials && Array.isArray(toothData.materials)) {
        for (const mat of toothData.materials) {
          if (mat.material) {
            const [materialItem] = await db
              .select()
              .from(material)
              .where(eq(material.id, mat.material));

            if (materialItem) {
              const parsedMaterialPrice = parseDefinedPrice(materialItem.price);
              const materialPrice =
                parsedMaterialPrice === null
                  ? null
                  : redesignPrice(
                      parsedMaterialPrice,
                      isRedesignQuote,
                      materialItem.haveRedesign ?? false,
                    );

              // دریافت مسیر فایل اگر وجود داشته باشد
              let filePath = null;
              if (mat.file) {
                const [fileRecord] = await db
                  .select({ path: files.path })
                  .from(files)
                  .where(eq(files.id, mat.file));
                if (fileRecord) {
                  filePath = fileRecord.path;
                }
              }

              materialsArray.push({
                id: materialItem.id,
                title: materialItem.title,
                price: materialPrice,
                file: filePath,
                text: mat.text || null,
              });

              if (materialPrice !== null) {
                materialsTotal += materialPrice;
              } else {
                toothHasMissingPrice = true;
                hasMissingPrice = true;
              }
            } else {
              toothHasMissingPrice = true;
              hasMissingPrice = true;
            }
          }
        }
      }

      const toothTotal = !toothHasMissingPrice
        ? categoryPriceNum + materialsTotal
        : 0;
      if (!toothHasMissingPrice) {
        subtotal += toothTotal;
      }

      const toothDetail: any = {
        id: toothData.id,
        toothnumber: toothData.toothnumber,
        category: toothData.category,
        categoryDetail: toothData.category
          ? {
              id: toothData.category,
              title: toothData.categoryName,
              color: toothData.colorCode,
              price:
                parsedCategoryPrice === null
                  ? null
                  : redesignPrice(parsedCategoryPrice, isRedesignQuote , toothData.haveRedesign ?? false),
            }
          : null,
        categoryName: toothData.categoryName,
        categoryPrice: categoryPriceNum,
        device: toothData.device,
        devicePrice: null,
        materialshade: toothData.materialshade,
        materials: materialsArray,
        materialsTotal: materialsTotal,
        toothTotal: toothTotal,
        volume: toothData.volume || [],
        colorCode: toothData.colorCode,
        color: toothData.color,
        price: toothTotal,
        order: teethRelations.find((ot) => ot.toothId === toothData.id),
        hasMissingPrice: toothHasMissingPrice,
      };

      teethDetails.push(toothDetail);
    }

    const serviceSubtotal = independentServices.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0,
    );
    if (!hasMissingPrice) subtotal += serviceSubtotal;

    // محاسبه summary
    const isVip = order.vip === true;
    const finalSubtotal = hasMissingPrice ? 0 : subtotal;
    const vipAmount =
      !hasMissingPrice && isVip ? (finalSubtotal * vipPercent) / 100 : 0;
    const totalBeforeTax = finalSubtotal + vipAmount;
    const priced = billAfterDiscount({
      beforeTaxToman: hasMissingPrice ? 0 : totalBeforeTax,
      taxPercent: hasMissingPrice ? 0 : taxPercent,
      discountToman: hasMissingPrice ? 0 : Number(order.discountToman ?? 0),
    });
    const taxAmount = priced.taxAmount;
    const finalTotal = hasMissingPrice ? 0 : priced.total;

    return successResponse(
      res,
      200,
      {
        order: {
          ...order,
          connections: order.connections ?? [],
          antagonists: order.antagonists ?? [],
        },
        teeth: teethDetails,
        independentServices,
        summary: {
          subtotal: finalSubtotal,
          vip: vipAmount,
          vipPercent: vipPercent,
          taxPercent: taxPercent,
          taxAmount: taxAmount,
          discountCode: order.discountCode ?? null,
          discountToman: priced.discountToman,
          total: finalTotal,
          hasMissingPrice: hasMissingPrice,
          vipInfo: vipItem
            ? {
                percent: vipItem.percent,
                des: vipItem.description,
                startTime: vipItem.startTime,
                endTime: vipItem.endTime,
              }
            : null,
        },
      },
      "Order fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching order:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createOrderWithRefrence = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const [originalOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, +id));

    if (!originalOrder) {
      return errorResponse(res, 404, "Order not found", null);
    }

    if (originalOrder.user_id !== user.userId && user.role !== "admin") {
      return errorResponse(
        res,
        403,
        "You are not authorized to access this order",
        null,
      );
    }

    if (originalOrder.refrence != null || originalOrder.status !== "finaldelivery") {
      return errorResponse(res, 400, "REDESIGN_NOT_ALLOWED", null);
    }

    const originalOrderTeeth = await db
      .select()
      .from(orderTeeth)
      .where(eq(orderTeeth.orderId, +id));

    if (originalOrderTeeth.length === 0) {
      return errorResponse(res, 404, "No teeth found for this order", null);
    }

    const originalTeethIds = originalOrderTeeth.map((t) => t.toothId);

    const originalTeethData = await db
      .select({
        id: tooth.id,
        toothnumber: tooth.toothnumber,
        category: tooth.category,
        device: tooth.device,
        materialshade: tooth.materialshade,
        materials: tooth.materials,
        volume: tooth.volume,
      })
      .from(tooth)
      .where(inArray(tooth.id, originalTeethIds));

    const {
      title,
      patientname,
      patientlastname,
      patientage,
      patientgender,
      comment,
      file,
      discount,
      discountCode,
      vip: vipParametr,
      teeth,
    } = req.body;

    if (!teeth || !Array.isArray(teeth) || teeth.length === 0) {
      return errorResponse(
        res,
        400,
        "At least one tooth must be selected",
        null,
      );
    }

    if (teeth.length !== originalTeethData.length) {
      return errorResponse(
        res,
        400,
        "تعداد دندان‌ها باید با order اصلی یکسان باشد",
        null,
      );
    }

    // ---------- بررسی category و toothnumber ----------
    const originalCategories = originalTeethData.map((t) => ({
      toothnumber: t.toothnumber,
      category: t.category,
    }));

    const newCategories = teeth.map((t: any) => ({
      toothnumber: +t.toothnumber || null,
      category: +t.category || null,
    }));

    // مقایسه category ها
    const originalCategoriesSorted = [...originalCategories].sort((a, b) => {
      const toothCompare = (a.toothnumber || 0) - (b.toothnumber || 0);
      if (toothCompare !== 0) return toothCompare;
      return (a.category || 0) - (b.category || 0);
    });

    const newCategoriesSorted = [...newCategories].sort((a, b) => {
      const toothCompare = (a.toothnumber || 0) - (b.toothnumber || 0);
      if (toothCompare !== 0) return toothCompare;
      return (a.category || 0) - (b.category || 0);
    });

    const categoriesMatch =
      JSON.stringify(originalCategoriesSorted) ===
      JSON.stringify(newCategoriesSorted);

    if (!categoriesMatch) {
      return errorResponse(
        res,
        400,
        "category یا دندان‌ها با order اصلی مطابقت ندارند",
        null,
      );
    }

    // ---------- ایجاد teeth values و محاسبه قیمت ----------
    let totalPrice = 0;
    const teethValues = teeth.map((t: any, index: number) => {
      // پیدا کردن دندان متناظر از order اصلی بر اساس toothnumber و category
      const originalTooth = originalTeethData.find(
        (ot) =>
          ot.toothnumber === (+t.toothnumber || null) &&
          ot.category === (+t.category || null),
      );
      const originalMaterials = (originalTooth?.materials as any[]) || [];

      // ساخت materials: ترکیب داده‌های جدید با قدیمی
      let materialsData: any[] = [];

      // اگر materials جدید وجود دارد
      if (t.materials && Array.isArray(t.materials) && t.materials.length > 0) {
        materialsData = t.materials.map((mat: any, matIndex: number) => {
          const originalMat = originalMaterials[matIndex] || {};

          // file: اگر جدید ست شده استفاده کن، در غیر این صورت از قدیمی
          let fileValue = mat.file;
          const isFileEmpty =
            fileValue === null ||
            fileValue === undefined ||
            fileValue === "" ||
            (typeof fileValue === "object" &&
              fileValue &&
              !Array.isArray(fileValue) &&
              Object.keys(fileValue).length === 0);
          if (isFileEmpty && !Array.isArray(mat.files)) {
            fileValue = originalMat.file || null;
          }

          let filesValue = materialFileIds(mat);
          if (filesValue.length === 0) filesValue = materialFileIds(originalMat);

          // text: اگر جدید ست شده استفاده کن، در غیر این صورت از قدیمی
          let textValue = mat.text;
          if (
            textValue === null ||
            textValue === undefined ||
            textValue === ""
          ) {
            textValue = originalMat.text || null;
          }

          // material: اگر جدید ست شده استفاده کن، در غیر این صورت از قدیمی
          let materialValue = mat.material;
          if (materialValue === null || materialValue === undefined) {
            materialValue = originalMat.material || null;
          }

          return {
            material: materialValue,
            file: filesValue[0] ?? (typeof fileValue === "string" ? fileValue : fileValue || null),
            files: filesValue,
            text: textValue,
          };
        });
      } else {
        // materials جدید خالی است، کامل از order اصلی کپی کن
        materialsData = originalMaterials.map((mat: any) => storedMaterial(mat));
      }

      // 0 means "not selected". A missing field keeps the original order's value.
      const deviceValue =
        t.device === undefined || t.device === null
          ? optionalForeignKey(originalTooth?.device)
          : optionalForeignKey(t.device);
      const materialshadeValue =
        t.materialshade === undefined || t.materialshade === null
          ? optionalForeignKey(originalTooth?.materialshade)
          : optionalForeignKey(t.materialshade);

      return {
        toothnumber: +t.toothnumber || null,
        category: +t.category || null,
        device: deviceValue,
        materialshade: materialshadeValue,
        materials: materialsData,
        volume: normalizeToothVolumes(t.volume || originalTooth?.volume || []),
      };
    });

    const missingMaterialInput =
      await findMissingRequiredMaterialInput(teethValues);
    if (missingMaterialInput) {
      return errorResponse(
        res,
        400,
        `وارد کردن اطلاعات متریال «${missingMaterialInput}» اجباری است`,
        null,
      );
    }

    for (let i = 0; i < teeth.length; i++) {
      const t = teeth[i];
      let toothPrice = 0;

      // Category price
      if (t.category) {
        const [categoryItem] = await db
          .select({
            price: category.price,
            haveRedesign: category.haveRedesign,
          })
          .from(category)
          .where(eq(category.id, +t.category))
          .limit(1);

        const categoryPrice = parseDefinedPrice(categoryItem?.price);
        if (categoryPrice !== null) {
          toothPrice += redesignPrice(
            categoryPrice,
            true,
            categoryItem?.haveRedesign ?? false,
          );
        }
      }

      if (t.materials && Array.isArray(t.materials)) {
        for (const mat of t.materials) {
          if (mat.material) {
            const [materialItem] = await db
              .select({
                price: material.price,
                haveRedesign: material.haveRedesign,
              })
              .from(material)
              .where(eq(material.id, mat.material))
              .limit(1);

            const materialPrice = parseDefinedPrice(materialItem?.price);
            if (materialPrice !== null) {
              toothPrice += redesignPrice(
                materialPrice,
                true,
                materialItem?.haveRedesign ?? false,
              );
            }
          }
        }
      }

      totalPrice += toothPrice;
    }

    const [taxItem] = await db.select().from(tax);
    const taxPercent = taxItem ? Number(taxItem.percent || 0) : 0;

    const [vipItem] = await db.select().from(vip);
    const vipPercent = vipItem ? Number(vipItem.percent || 0) : 0;

    const billablePrice = totalPrice;
    const isVip = vipParametr === "true" || vipParametr === true;
    const vipAmount = isVip ? (billablePrice * vipPercent) / 100 : 0;
    const totalBeforeTax = billablePrice + vipAmount;
    const appliedDiscount = await applyDiscountToBeforeTax(
      discountCode,
      totalBeforeTax,
      taxPercent,
    );
    if (!appliedDiscount.ok) {
      return errorResponse(res, 400, appliedDiscount.message, null);
    }
    const taxAmount = appliedDiscount.taxAmount;
    const finalTotal = appliedDiscount.total;

    const created = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, +id))
        .for("update");

      if (!locked || locked.refrence != null || locked.status !== "finaldelivery") {
        return { rejected: "REDESIGN_NOT_ALLOWED" as const };
      }

      const [existingRedesign] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.refrence, +id), eq(orders.isDeleted, 0)))
        .limit(1);

      if (existingRedesign) {
        return { rejected: "REDESIGN_ALREADY_USED" as const };
      }

      const [orderRow]: any = await tx
        .insert(orders)
        .values({
          title: title || originalOrder.title || null,
          user_id: user.userId,
          patientname: patientname || originalOrder.patientname || null,
          patientlastname:
            patientlastname || originalOrder.patientlastname || null,
          patientage: patientage
            ? parseInt(patientage, 10)
            : originalOrder.patientage || null,
          patientgender: patientgender || originalOrder.patientgender || null,
          report: null,
          status: "payment" as OrderStatus,
          totalaprice: String(finalTotal),
          paymentstatus: false,
          comment: comment || null,
          // اگر فایل جدید نیامده، از فایل order اصلی استفاده کن
          file: file || originalOrder.file || null,
          discount: discount
            ? parseInt(discount, 10)
            : originalOrder.discount || null,
          discountCode: appliedDiscount.code,
          discountToman: appliedDiscount.discountToman,
          vip: vipParametr === "true" || vipParametr === true || false,
          connections: originalOrder.connections || [],
          antagonists: originalOrder.antagonists || [],
          refrence: +id,
        })
        .returning();

      const teethRows = await tx.insert(tooth).values(teethValues).returning();

      const orderTeethData = teethRows.map((t) => ({
        orderId: orderRow.id,
        toothId: t.id,
      }));
      if (orderTeethData.length) await tx.insert(orderTeeth).values(orderTeethData);

      return { rejected: null, createdOrder: orderRow, createdTeeth: teethRows };
    });

    if (created.rejected) {
      return errorResponse(res, 400, created.rejected, null);
    }

    const { createdOrder, createdTeeth } = created;

    const teethIds = createdTeeth.map((t) => t.id);

    const detailedTeeth = await db
      .select({
        id: tooth.id,
        toothnumber: tooth.toothnumber,
        category: tooth.category,
        categoryName: category.title,
        categoryPrice: category.price,
        categoryHaveRedesign: category.haveRedesign,
        device: tooth.device,
        materialshade: tooth.materialshade,
        materials: tooth.materials,
        volume: tooth.volume,
        colorCode: color.code,
        color: color.id,
      })
      .from(tooth)
      .leftJoin(category, eq(tooth.category, category.id))
      .leftJoin(device, eq(tooth.device, device.id))
      .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
      .leftJoin(color, eq(category.color, color.id))
      .where(inArray(tooth.id, teethIds));

    const finalTeeth = await Promise.all(
      detailedTeeth.map(async (t) => {
        const categoryAmount = parseDefinedPrice(t.categoryPrice);
        let toothTotalPrice =
          categoryAmount === null
            ? 0
            : redesignPrice(categoryAmount, true, t.categoryHaveRedesign ?? false);

        if (t.materials && Array.isArray(t.materials)) {
          for (const mat of t.materials) {
            if (mat.material) {
              const [materialItem] = await db
                .select({
                  price: material.price,
                  haveRedesign: material.haveRedesign,
                })
                .from(material)
                .where(eq(material.id, mat.material))
                .limit(1);

              const materialPrice = parseDefinedPrice(materialItem?.price);
              if (materialPrice !== null) {
                toothTotalPrice += redesignPrice(
                  materialPrice,
                  true,
                  materialItem?.haveRedesign ?? false,
                );
              }
            }
          }
        }

        return {
          ...t,
          price: toothTotalPrice,
        };
      }),
    );

    // ---------- link attachment files to order ----------
    const attachmentFileIdsRef: number[] = (req as any).attachmentFileIds ?? [];
    let attachmentFileRecordsRef: typeof files.$inferSelect[] = [];

    if (attachmentFileIdsRef.length > 0) {
      await db.insert(orderFiles).values(
        attachmentFileIdsRef.map((fileId) => ({
          orderId: createdOrder.id,
          fileId,
          role: "user" as const,
        }))
      );

      attachmentFileRecordsRef = await db
        .select()
        .from(files)
        .where(inArray(files.id, attachmentFileIdsRef));

      if (!createdOrder.file && attachmentFileRecordsRef.length > 0) {
        await db
          .update(orders)
          .set({ file: attachmentFileRecordsRef[0].path })
          .where(eq(orders.id, createdOrder.id));
        createdOrder.file = attachmentFileRecordsRef[0].path;
      }
    }

    const paymentRow = await ensurePendingPayment(createdOrder.id);
    createdOrder.status = "payment";

    return successResponse(
      res,
      200,
      {
        order: createdOrder,
        teeth: finalTeeth,
        teethIds,
        payment: paymentRow,
        vip: vipAmount || 0,
        vipPercent: vipPercent || 0,
        discountCode: appliedDiscount.code,
        discountToman: appliedDiscount.discountToman,
        originalOrderId: +id,
        files: attachmentFileRecordsRef,
      },
      "Order created successfully with reference",
    );
  } catch (error) {
    console.error("Error creating order with reference:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const {
      title,
      patientname,
      patientlastname,
      patientage,
      patientgender,
      report,
      status,
      comment,
      file,
      discount,
      discountCode,
      vip: vipParametr,
      teeth,
      connections,
      antagonists,
    } = req.body;
    const { id } = req.params;
    const user = (req as any).user;

    // ---------- check order ----------
    const order = await db.select().from(orders).where(eq(orders.id, +id));
    if (!order.length) return errorResponse(res, 404, "Order not found", null);
    if (order[0].user_id !== user.userId && user.role !== "admin")
      return errorResponse(
        res,
        403,
        "You are not authorized to update this order",
        null,
      );

    const nextStatus = (status || "uploadfile") as OrderStatus;
    if (isWorkOrderStatus(nextStatus) && !order[0].paymentstatus) {
      return errorResponse(
        res,
        400,
        "Order must be paid before this status",
        null,
      );
    }
    if (nextStatus === "payment" && !order[0].paymentstatus) {
      await ensurePendingPayment(+id);
    }

    if (!teeth || !Array.isArray(teeth) || teeth.length === 0)
      return errorResponse(
        res,
        400,
        "At least one tooth must be selected",
        null,
      );

    const teethValues = teeth.map((t: any) => ({
      toothnumber: +t.toothnumber || null,
      category: +t.category || null,
      device: +t.device || null,
      materialshade: +t.materialshade || null,
      volume: normalizeToothVolumes(t.volume),
    }));
    const toothPrice = await calculateTeethTotalPrice(db, teethValues, {
      category,
      device,
      materialshade,
      volume,
    });
    const totalPrice =
      toothPrice + (await sumIndependentServiceSnapshots(db, +id));

    const codeRequest = readDiscountCodeInput(discountCode);
    const currentDiscountCode = order[0].discountCode ?? null;
    if (order[0].paymentstatus) {
      const nextCode =
        codeRequest.state === "absent"
          ? currentDiscountCode
          : codeRequest.state === "empty"
            ? null
            : codeRequest.state === "code"
              ? codeRequest.code
              : null;
      if (codeRequest.state === "invalid" || nextCode !== currentDiscountCode) {
        return errorResponse(
          res,
          400,
          "بعد از پرداخت نمی‌توان کد تخفیف را تغییر داد",
          null,
        );
      }
    }

    let pricedTotal = totalPrice;
    let discountCodeToStore: string | null = currentDiscountCode;
    let discountTomanToStore: number | null = order[0].discountToman ?? null;
    if (!order[0].paymentstatus) {
      const codeForPricing =
        codeRequest.state === "code"
          ? codeRequest.code
          : codeRequest.state === "absent"
            ? currentDiscountCode
            : undefined;
      const appliedDiscount = await applyDiscountToBeforeTax(
        codeForPricing,
        totalPrice,
        0,
      );
      if (!appliedDiscount.ok) {
        return errorResponse(res, 400, appliedDiscount.message, null);
      }
      pricedTotal = appliedDiscount.total;
      discountCodeToStore = appliedDiscount.code;
      discountTomanToStore = appliedDiscount.discountToman;
    }

    // ---------- remove old teeth ----------
    const oldTeeth = await db
      .select()
      .from(orderTeeth)
      .where(eq(orderTeeth.orderId, +id));
    const oldToothIds = oldTeeth.map((t) => t.toothId);
    if (oldToothIds.length) {
      await db.delete(orderTeeth).where(eq(orderTeeth.orderId, +id));
      await db.delete(tooth).where(inArray(tooth.id, oldToothIds));
    }

    const createdTeeth = await db.insert(tooth).values(teethValues).returning();

    // ---------- insert orderTeeth ----------
    const orderTeethData = createdTeeth.map((t) => ({
      orderId: +id,
      toothId: t.id,
    }));
    if (orderTeethData.length)
      await db.insert(orderTeeth).values(orderTeethData);

    const teethIds = createdTeeth.map((t) => t.id);

    // ---------- fetch detailed teeth info ----------
    const detailedTeeth = await db
      .select({
        id: tooth.id,
        toothnumber: tooth.toothnumber,
        category: tooth.category,
        categoryName: category.title,
        categoryPrice: category.price,
        device: tooth.device,
        materialshade: tooth.materialshade,
        volume: tooth.volume,
        colorCode: color.code,
        color: color,
      })
      .from(tooth)
      .leftJoin(category, eq(tooth.category, category.id))
      .leftJoin(device, eq(tooth.device, device.id))
      .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
      .leftJoin(color, eq(category.color, color.id))
      .where(inArray(tooth.id, teethIds));

    const finalTeeth = detailedTeeth.map((t) => {
      const volumeTotal = Array.isArray(t.volume)
        ? t.volume.reduce((sum, v) => sum + +(v.price ?? 0), 0)
        : 0;
      const total = Number(t.categoryPrice ?? 0) + volumeTotal;

      return {
        ...t,
        price: total,
      };
    });

    // ---------- update order ----------
    const [updatedOrder] = await db
      .update(orders)
      .set({
        title,
        patientname,
        patientlastname: patientlastname || null,
        patientage: patientage ? parseInt(patientage, 10) : null,
        patientgender: patientgender || null,
        report: report ? parseInt(report, 10) : null,
        status: nextStatus,
        totalaprice: order[0].paymentstatus ? order[0].totalaprice : String(pricedTotal),
        comment,
        file,
        discount: discount ? parseInt(discount, 10) : null,
        discountCode: discountCodeToStore,
        discountToman: discountTomanToStore,
        vip: vipParametr === "true" || false,
        connections: connections || [],
        antagonists: antagonists || [],
      })
      .where(eq(orders.id, +id))
      .returning();
    const [vipItem] = await db.select({ percent: vip.percent }).from(vip);

    return successResponse(
      res,
      200,
      {
        order: updatedOrder,
        teeth: finalTeeth,
        teethIds,
        vipPercent: vipItem ? Number(vipItem.percent || 0) : 0,
      },
      "Order updated successfully",
    );
  } catch (error) {
    console.error("Error updating order:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const submitOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vip, comment } = req.body;
    const user = (req as any).user;

    const order = await db.select().from(orders).where(eq(orders.id, +id));
    if (!order.length) return errorResponse(res, 404, "Order not found", null);
    if (order[0].user_id !== user.userId)
      return errorResponse(res, 403, "You are not authorized to submit this order", null);
    if (order[0].status !== "uploadfile")
      return errorResponse(res, 400, "Order cannot be submitted in this status", null);

    const existingPayment = await findOrderPayment(+id);
    if (order[0].paymentstatus || existingPayment?.status === "paid")
      return errorResponse(res, 400, "Order is already paid", null);

    const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];

    let firstFilePath: string | null = null;
    if (uploadedFiles.length > 0) {
      const insertedFiles = await db
        .insert(files)
        .values(
          uploadedFiles.map((file) => ({
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            user_id: user?.id || null,
          }))
        )
        .returning();

      await db.insert(orderFiles).values(
        insertedFiles.map((f) => ({
          orderId: +id,
          fileId: f.id,
          role: "user" as const,
        }))
      );

      firstFilePath = uploadedFiles[0].path;
    }

    const paymentRow = await ensurePendingPayment(+id);

    await db
      .update(orders)
      .set({
        comment: comment || null,
        // ثبت برای پرداخت فایل جدیدی نمی‌فرستد؛ مسیر فایل قبلی را پاک نکن
        file: firstFilePath ?? order[0].file,
        status: "payment" as OrderStatus,
        vip: vip,
      })
      .where(eq(orders.id, +id));

    return successResponse(res, 200, { payment: paymentRow }, "Order submitted successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

const releaseUploadfileOrders = async (userId?: number) => {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      combineFilters(
        eq(orders.status, "uploadfile"),
        eq(orders.isDeleted, 0),
        userId === undefined ? undefined : eq(orders.user_id, userId),
      ),
    );

  for (const row of rows) {
    await ensurePendingPayment(row.id);
    await db
      .update(orders)
      .set({ status: "payment" as OrderStatus, updatedAt: new Date() })
      .where(eq(orders.id, row.id));
  }
};

export const orderList = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await releaseUploadfileOrders(user.userId);
    const filters = readOrderListFilters(req);
    if (!filters.ok) return errorResponse(res, 400, filters.error, null);

    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);

    const whereClause = combineFilters(
      eq(orders.user_id, user.userId),
      eq(orders.isDeleted, 0),
      filters.status ? eq(orders.status, filters.status) : undefined,
      filters.paymentStatus
        ? eq(payment.status, filters.paymentStatus)
        : undefined,
      filters.vip === undefined ? undefined : eq(orders.vip, filters.vip),
      matchesText(filters.q, [
        orders.id,
        orders.title,
        orders.patientname,
        orders.patientlastname,
        orders.comment,
      ]),
    );

    /* ------------------ TOTAL COUNT ------------------ */
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .where(whereClause);

    /* ------------------ ORDERS LIST ------------------ */
    const ordersList = await db
      .select({
        id: orders.id,
        title: orders.title,
        user_id: orders.user_id,
        status: orders.status,
        patientname: orders.patientname,
        patientlastname: orders.patientlastname,
        patientage: orders.patientage,
        patientgender: orders.patientgender,
        paymentstatus: orders.paymentstatus,
        totalaprice: orders.totalaprice,
        comment: orders.comment,
        file: orders.file,
        adminFile: orders.adminFile,
        discount: orders.discount,
        discountCode: orders.discountCode,
        discountToman: orders.discountToman,
        vip: orders.vip,
        deliveryDate: orders.deliveryDate,
        report: orders.report,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        refrence: orders.refrence,
        doctorName: orderOwner.name,
        doctorLastName: orderOwner.lastName,
        payment: {
          id: payment.id,
          status: payment.status,
          isAccepted: payment.isAccepted,
          type: payment.type,
          trackingCode: payment.trackingCode,
        },
      })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .leftJoin(orderOwner, eq(orderOwner.id, orders.user_id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    if (!ordersList.length) {
      return successResponse(
        res,
        200,
        {
          items: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 1,
          },
        },
        "Orders fetched successfully",
      );
    }

    /* ------------------ CATEGORIES + FILES ------------------ */
    const orderIds = ordersList.map((o) => o.id);
    const { tickets: ticketMap, messageCount } = await loadOrderTickets(orderIds, user.role);
    const redesignedRows = orderIds.length
      ? await db
          .select({ parentId: orders.refrence })
          .from(orders)
          .where(and(inArray(orders.refrence, orderIds), eq(orders.isDeleted, 0)))
      : [];
    const redesignedParentIds = new Set(
      redesignedRows
        .map((row) => row.parentId)
        .filter((parentId): parentId is number => typeof parentId === "number"),
    );

    const allOrderFiles = orderIds.length
      ? await db
          .select({
            orderId: orderFiles.orderId,
            fileId: files.id,
            filename: files.filename,
            originalname: files.originalname,
            mimetype: files.mimetype,
            size: files.size,
            path: files.path,
            role: orderFiles.role,
            createdAt: files.createdAt,
          })
          .from(orderFiles)
          .innerJoin(files, eq(files.id, orderFiles.fileId))
          .where(inArray(orderFiles.orderId, orderIds))
      : [];

    const filesByOrderId = allOrderFiles.reduce<Record<number, typeof allOrderFiles>>(
      (acc, f) => {
        if (!acc[f.orderId]) acc[f.orderId] = [];
        acc[f.orderId].push(f);
        return acc;
      },
      {}
    );
    const independentByOrder = await loadIndependentServicesByOrders(db, orderIds);

    const ordersWithCategories = await Promise.all(
      ordersList.map(async (order) => {
        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, order.id));

        const teethIds = teethRelations.map((t) => t.toothId);

        let uniqueCategories: { categoryId: number | null; categoryName: string | null }[] = [];

        if (teethIds.length) {
          const teethCategories = await db
            .select({
              categoryId: tooth.category,
              categoryName: category.title,
            })
            .from(tooth)
            .leftJoin(category, eq(tooth.category, category.id))
            .where(inArray(tooth.id, teethIds));

          uniqueCategories = teethCategories.reduce<
            { categoryId: number | null; categoryName: string | null }[]
          >((acc, c) => {
            if (!acc.find((x) => x.categoryId === c.categoryId)) acc.push(c);
            return acc;
          }, []);
        }

        return {
          ...order,
          redesignUsed: redesignedParentIds.has(order.id),
          categories: uniqueCategories,
          independentServices: independentByOrder.get(order.id) ?? [],
          files: filesByOrderId[order.id] ?? [],
          tickets: ticketMap.get(order.id) ?? [],
          messageCount: messageCount.get(order.id) ?? 0,
        };
      }),
    );

    /* ------------------ RESPONSE ------------------ */
    return successResponse(
      res,
      200,
      {
        items: ordersWithCategories,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Orders fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const orderDropDown = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);
    const whereClause = combineFilters(
      eq(orders.user_id, user.userId),
      matchesText(searchText(req), [
        orders.id,
        orders.title,
        orders.patientname,
        orders.patientlastname,
      ]),
    );

    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .where(whereClause);

    const ordersList = await db
      .select({
        id: orders.id,
        title: sql<string>`trim(concat_ws(' ', ${orders.patientname}, ${orders.patientlastname}))`,
      })
      .from(orders)
      .where(whereClause)
      .orderBy(orderByClause);

    return successResponse(
      res,
      200,
      {
        items: ordersList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Orders fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const orderListAdmin = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== "admin") {
      return errorResponse(
        res,
        403,
        "You are not authorized to access this resource",
        null,
      );
    }

    await releaseUploadfileOrders();
    const filters = readOrderListFilters(req);
    if (!filters.ok) return errorResponse(res, 400, filters.error, null);

    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);

    const whereClause = combineFilters(
      eq(orders.isDeleted, 0),
      filters.status ? eq(orders.status, filters.status) : undefined,
      filters.paymentStatus
        ? eq(payment.status, filters.paymentStatus)
        : undefined,
      filters.vip === undefined ? undefined : eq(orders.vip, filters.vip),
      matchesText(filters.q, [
        orders.id,
        orders.title,
        orders.patientname,
        orders.patientlastname,
        orders.comment,
        orderOwner.name,
        orderOwner.lastName,
        orderOwner.email,
        orderOwner.phoneNumber,
        orderOwner.laboratoryName,
      ]),
    );

    /* ------------------ TOTAL ------------------ */
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .leftJoin(orderOwner, eq(orderOwner.id, orders.user_id))
      .where(whereClause);

    /* ------------------ ORDERS ------------------ */
    const ordersList = await db
      .select()
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .leftJoin(users, eq(users.id, orders.designer_id))
      .leftJoin(orderOwner, eq(orderOwner.id, orders.user_id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    /* ------------------ FILES ------------------ */
    const orderIds = ordersList.map(({ orders: order }) => order.id);
    const { tickets: ticketMap, messageCount } = await loadOrderTickets(orderIds, user.role);
    const allOrderFiles = orderIds.length
      ? await db
          .select({
            orderId: orderFiles.orderId,
            fileId: files.id,
            filename: files.filename,
            originalname: files.originalname,
            mimetype: files.mimetype,
            size: files.size,
            path: files.path,
            role: orderFiles.role,
            createdAt: files.createdAt,
          })
          .from(orderFiles)
          .innerJoin(files, eq(files.id, orderFiles.fileId))
          .where(inArray(orderFiles.orderId, orderIds))
      : [];

    const filesByOrderId = allOrderFiles.reduce<
      Record<number, typeof allOrderFiles>
    >((acc, f) => {
      if (!acc[f.orderId]) acc[f.orderId] = [];
      acc[f.orderId].push(f);
      return acc;
    }, {});
    const independentByOrder = await loadIndependentServicesByOrders(db, orderIds);

    /* ------------------ CATEGORIES + PAYMENT (OUTPUT SAME) ------------------ */
    const ordersWithCategories = await Promise.all(
      ordersList.map(async ({ orders: order, order_owner: owner }) => {
        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, order.id));

        const teethIds = teethRelations.map((t) => t.toothId);

        const teethCategories = teethIds.length
          ? await db
              .select({
                categoryId: tooth.category,
                categoryName: category.title,
              })
              .from(tooth)
              .leftJoin(category, eq(tooth.category, category.id))
              .where(inArray(tooth.id, teethIds))
          : [];

        const paymentItem = await db
          .select({
            id: payment.id,
            status: payment.status,
            isAccepted: payment.isAccepted,
            type: payment.type,
            file: payment.file,
            trackingCode: payment.trackingCode,
            description: payment.description,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
          })
          .from(payment)
          .where(eq(payment.order_id, order.id));

        return {
          ...order,
          doctorName: owner?.name ?? null,
          doctorLastName: owner?.lastName ?? null,
          categories: teethCategories,
          independentServices: independentByOrder.get(order.id) ?? [],
          payment: paymentItem[0] || null,
          files: filesByOrderId[order.id] ?? [],
          tickets: ticketMap.get(order.id) ?? [],
          messageCount: messageCount.get(order.id) ?? 0,
        };
      }),
    );

    /* ------------------ RESPONSE ------------------ */
    return successResponse(
      res,
      200,
      {
        items: ordersWithCategories.filter((item) => item.payment !== null),
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Orders fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const changeOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status, orderId, totalPrice } = req.body;
    const user = (req as any).user;
    if (user.role !== "admin") {
      return errorResponse(
        res,
        403,
        "You are not authorized to access this resource",
        null,
      );
    }
    const uploadedFiles = (
      Array.isArray(req.files) ? req.files : req.file ? [req.file] : []
    ) as Express.Multer.File[];
    if (uploadedFiles.length > 0) {
      const fileRecords = await db
        .insert(files)
        .values(
          uploadedFiles.map((file) => ({
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            user_id: (req as any).user?.id || null,
          }))
        )
        .returning();
      await db.insert(orderFiles).values(
        fileRecords.map((record) => ({
          orderId: +orderId,
          fileId: record.id,
          role: "admin" as const,
        }))
      );
    }
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, +orderId));
    if (!order) return errorResponse(res, 404, "Order not found", null);

    const [currentOrder] = await db
      .select({ adminFile: orders.adminFile })
      .from(orders)
      .where(eq(orders.id, +orderId))
      .limit(1);

    const adminFileValue = uploadedFiles[0]?.path || currentOrder?.adminFile || null;
    const parsedPrice = Number(totalPrice);
    // totalaprice already includes VIP and tax. The form amount is the payable total.
    const payablePrice = Number.isFinite(parsedPrice)
      ? parsedPrice
      : Number(order.totalaprice || 0);

    const nextStatus = status as OrderStatus;
    if (isWorkOrderStatus(nextStatus) && !order.paymentstatus) {
      await settleUnpaidOrderByAdmin(+orderId, payablePrice);
    }
    if (nextStatus === "payment" && !order.paymentstatus) {
      await ensurePendingPayment(+orderId);
    }

    await db
      .update(orders)
      .set({
        status: nextStatus,
        adminFile: adminFileValue,
        totalaprice: String(payablePrice),
      })
      .where(eq(orders.id, +orderId));

    return successResponse(
      res,
      200,
      {
        order: orderId,
      },
      "Order status changed successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [order] = await db.select().from(orders).where(eq(orders.id, +id));
    if (!order) return errorResponse(res, 404, "Order not found", null);

    const existing = await findOrderPayment(+id);
    const alreadyPaid = existing?.status === "paid";

    if (!alreadyPaid) {
      const settled = await settleUnpaidOrderByAdmin(+id);
      if (!settled) {
        return errorResponse(res, 400, "Payment could not be confirmed", null);
      }
    }

    const shouldMoveToCheck =
      order.status === "payment" || order.status === "uploadfile";
    if (shouldMoveToCheck) {
      await db
        .update(orders)
        .set({
          status: "check",
          paymentstatus: true,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, +id));
    }

    const [updated] = await db.select().from(orders).where(eq(orders.id, +id));
    return successResponse(
      res,
      200,
      { order: updated, alreadyPaid },
      alreadyPaid ? "Payment was already confirmed" : "Payment confirmed",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const uploadDesignerFile = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const user = (req as any).user;
    if (user.role !== "designer") {
      return errorResponse(
        res,
        403,
        "You are not authorized to access this resource",
        null,
      );
    }
    const uploaded = (
      Array.isArray(req.files) ? req.files : req.file ? [req.file] : []
    ) as Express.Multer.File[];
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, +orderId));
    if (!order) return errorResponse(res, 404, "Order not found", null);
    if (!order.paymentstatus) {
      return errorResponse(
        res,
        400,
        "Order must be paid before uploading a design file",
        null,
      );
    }

    let adminFileValue: string | null = null;
    if (uploaded.length > 0) {
      const usedNames = new Set<string>();
      const entries = uploaded.map((file) => {
        const original = path.basename(file.originalname || file.filename || "file");
        const ext = path.extname(original);
        const base = path.basename(original, ext) || "file";
        let name = `${base}${ext}`;
        let index = 2;
        while (usedNames.has(name)) {
          name = `${base}-${index}${ext}`;
          index += 1;
        }
        usedNames.add(name);
        return { name, filePath: file.path };
      });

      if (entries.length === 1) {
        adminFileValue = entries[0].filePath;
      } else {
        const zipName = `order-${orderId}-design-${Date.now()}.zip`;
        adminFileValue = path.join("uploads", zipName).replace(/\\/g, "/");
        await zipStoredFiles(entries, path.join(process.cwd(), adminFileValue));
      }

      const inserted = await db
        .insert(files)
        .values(
          uploaded.map((file) => ({
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            user_id: user?.id || null,
          })),
        )
        .returning();

      await db
        .delete(orderFiles)
        .where(and(eq(orderFiles.orderId, +orderId), eq(orderFiles.role, "designer")));

      await db.insert(orderFiles).values(
        inserted.map((record) => ({
          orderId: +orderId,
          fileId: record.id,
          role: "designer" as const,
        })),
      );
    }

    await db
      .update(orders)
      .set({
        status: "design" as OrderStatus,
        adminFile: adminFileValue,
      })
      .where(eq(orders.id, +orderId));
    return successResponse(
      res,
      200,
      {
        order: orderId,
      },
      "Send File successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const downloadAdminFile = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const user = (req as any).user;

    const [order] = await db
      .select({
        adminFile: orders.adminFile,
        user_id: orders.user_id,
        status: orders.status,
      })
      .from(orders)
      .where(eq(orders.id, +orderId));

    if (!order) {
      return errorResponse(res, 404, "Order not found", null);
    }

    if (user.userId !== order.user_id && user.role === "user") {
      return errorResponse(
        res,
        403,
        "You are not authorized to download this file",
        null,
      );
    }

    if (req.query.isConfirm === "1") {
      if (order.status !== "approval") {
        return errorResponse(
          res,
          400,
          "Order is not waiting for delivery confirmation",
          null,
        );
      }

      await db
        .update(orders)
        .set({
          status: "finaldelivery" as OrderStatus,
          deliveryDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, +orderId));

      return successResponse(res, 200, { id: +orderId }, "Delivery confirmed");
    }

    if (!order.adminFile) {
      return errorResponse(
        res,
        404,
        "Admin file not found for this order",
        null,
      );
    }

    const filePath = path.join(process.cwd(), order.adminFile);
    const downloadName = await downloadNameForStoredPath(order.adminFile);

    return res.download(filePath, downloadName, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        return errorResponse(res, 500, "Error in file download", err);
      }
    });
  } catch (error) {
    console.error("Error in downloadAdminFile:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

const timeToSeconds = (time: string) => {
  const [h = "0", m = "0", s = "0"] = time.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
};

const tehranClockSeconds = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => {
    const value = Number(parts.find((part) => part.type === type)?.value ?? "0");
    return Number.isFinite(value) ? value % 24 : 0;
  };
  return read("hour") * 3600 + read("minute") * 60 + read("second");
};

const isWithinVipHours = (
  startTime?: string | null,
  endTime?: string | null,
) => {
  if (!startTime || !endTime) return false;

  const current = tehranClockSeconds();
  const start = timeToSeconds(startTime);
  const end = timeToSeconds(endTime);

  // بازه عادی: 09:00 → 18:00 | بازه شبانه: 22:00 → 06:00
  if (start <= end) {
    return current >= start && current <= end;
  }
  return current >= start || current <= end;
};

export const calculateOrderPrice = async (req: Request, res: Response) => {
  try {
    const { teeth, vip: vipParametr, redesign, discountCode, independentServices } = req.body;
    const isRedesignQuote = isRedesignFlag(redesign);
    if (teeth != null && !Array.isArray(teeth)) {
      return errorResponse(res, 400, "Invalid order data", null);
    }
    const teethInput = Array.isArray(teeth) ? teeth : [];
    const resolvedServices = isRedesignQuote
      ? { ok: true as const, lines: [], subtotal: 0 }
      : await resolveIndependentSelection(independentServices);
    if (!resolvedServices.ok) {
      return errorResponse(res, 400, resolvedServices.message, null);
    }

    const [taxItem] = await db.select().from(tax);
    const taxPercent = taxItem ? Number(taxItem.percent || 0) : 0;

    const [vipItem] = await db.select().from(vip);
    const vipPercent = vipItem ? Number(vipItem.percent || 0) : 0;
    const hasVip = isWithinVipHours(vipItem?.startTime, vipItem?.endTime);
    const isVip =
      hasVip && (vipParametr === "true" || vipParametr === true);

    const teethDetails: any[] = [];
    let hasMissingPrice = false;
    let subtotal = 0;

    for (const toothData of teethInput) {
      const toothDetail: any = {
        toothnumber: toothData.toothnumber || null,
        category: null,
        categoryPrice: 0,
        materials: [],
        materialsTotal: 0,
        toothTotal: 0,
        hasMissingPrice: false,
      };

      // Get category price
      if (toothData.category) {
        const [categoryItem] = await db
          .select({
            id: category.id,
            title: category.title,
            color: color.code,
            price: category.price,
            haveRedesign: category.haveRedesign,
          })
          .from(category)
          .leftJoin(color, eq(category.color, color.id))
          .where(eq(category.id, toothData.category));

        if (categoryItem) {
          const categoryPrice = parseDefinedPrice(categoryItem.price);
          toothDetail.categoryDetail = {
            id: categoryItem.id,
            title: categoryItem.title,
            color: categoryItem.color,
            price: categoryPrice,
          };

          if (categoryPrice === null) {
            toothDetail.hasMissingPrice = true;
            hasMissingPrice = true;
          } else {
            toothDetail.categoryPrice = redesignPrice(
              categoryPrice,
              isRedesignQuote,
              categoryItem.haveRedesign ?? false
            );
          }
          if (toothDetail.categoryDetail) {
            toothDetail.categoryDetail.price =
              categoryPrice === null
                ? null
                : redesignPrice(categoryPrice, isRedesignQuote , categoryItem.haveRedesign ?? false);
          }
        } else {
          toothDetail.hasMissingPrice = true;
          hasMissingPrice = true;
        }
      } else {
        toothDetail.hasMissingPrice = true;
        hasMissingPrice = true;
      }

      if (toothData.materials && Array.isArray(toothData.materials)) {
        for (const mat of toothData.materials) {
          if (mat.material) {
            const [materialItem] = await db
              .select()
              .from(material)
              .where(eq(material.id, mat.material));

            if (materialItem) {
              const parsedMaterialPrice = parseDefinedPrice(materialItem.price);
              const materialPrice =
                parsedMaterialPrice === null
                  ? null
                  : redesignPrice(
                      parsedMaterialPrice,
                      isRedesignQuote,
                      materialItem.haveRedesign ?? false,
                    );
              toothDetail.materials.push({
                id: materialItem.id,
                title: materialItem.title,
                price: materialPrice,
              });

              if (materialPrice !== null) {
                toothDetail.materialsTotal += materialPrice;
              } else {
                toothDetail.hasMissingPrice = true;
                hasMissingPrice = true;
              }
            } else {
              toothDetail.hasMissingPrice = true;
              hasMissingPrice = true;
            }
          }
        }
      }

      if (!toothDetail.hasMissingPrice) {
        toothDetail.toothTotal =
          toothDetail.categoryPrice + toothDetail.materialsTotal;
        subtotal += toothDetail.toothTotal;
      } else {
        toothDetail.toothTotal = 0;
      }
      teethDetails.push(toothDetail);
    }

    if (!hasMissingPrice) subtotal += resolvedServices.subtotal;
    const finalSubtotal = hasMissingPrice ? 0 : subtotal;
    const vipAmount =
      !hasMissingPrice && isVip ? (finalSubtotal * vipPercent) / 100 : 0;
    const totalBeforeTax = finalSubtotal + vipAmount;
    const appliedDiscount = await applyDiscountToBeforeTax(
      discountCode,
      hasMissingPrice ? 0 : totalBeforeTax,
      hasMissingPrice ? 0 : taxPercent,
    );
    if (!appliedDiscount.ok) {
      return errorResponse(res, 400, appliedDiscount.message, null);
    }
    const taxAmount = appliedDiscount.taxAmount;
    const finalTotal = hasMissingPrice ? 0 : appliedDiscount.total;

    return successResponse(
      res,
      200,
      {
        teeth: teethDetails,
        independentServices: quoteIndependentServices(resolvedServices.lines),
        summary: {
          subtotal: finalSubtotal,
          vip: vipAmount,
          vipPercent: vipPercent,
          hasVip,
          taxPercent: taxPercent,
          taxAmount: taxAmount,
          discountCode: appliedDiscount.code,
          discountToman: appliedDiscount.discountToman,
          total: finalTotal,
          hasMissingPrice: hasMissingPrice,
          vipInfo: vipItem
            ? {
                percent: vipItem.percent,
                des: vipItem.description,
                startTime: vipItem.startTime,
                endTime: vipItem.endTime,
              }
            : null,
        },
      },
      "Price calculated successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const generateMaterialFilesPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const [order] = await db.select().from(orders).where(eq(orders.id, +id));

    if (!order) {
      return errorResponse(res, 404, "Order not found", null);
    }
    if (
      order.user_id !== user.userId &&
      user.role !== "admin" &&
      user.role !== "designer"
    ) {
      return errorResponse(
        res,
        403,
        "You are not authorized to access this order",
        null,
      );
    }

    const [orderUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, order.user_id));

    const teethRelations = await db
      .select()
      .from(orderTeeth)
      .where(eq(orderTeeth.orderId, +id));

    const independentServices = (
      await loadIndependentServicesByOrders(db, [+id])
    ).get(+id) ?? [];
    if (teethRelations.length === 0 && independentServices.length === 0) {
      return errorResponse(res, 404, "No teeth found for this order", null);
    }

    const teethIds = teethRelations.map((t) => t.toothId);

    const teethData = teethIds.length === 0 ? [] : await db
      .select({
        id: tooth.id,
        toothnumber: tooth.toothnumber,
        categoryId: category.id,
        categoryName: category.title,
        categoryPrice: category.price,
        categoryHaveRedesign: category.haveRedesign,
        deviceTitle: device.title,
        materialshadeTitle: materialshade.title,
        materials: tooth.materials,
        volume: tooth.volume,
      })
      .from(tooth)
      .leftJoin(category, eq(tooth.category, category.id))
      .leftJoin(device, eq(tooth.device, device.id))
      .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
      .where(inArray(tooth.id, teethIds))
      .orderBy(asc(tooth.toothnumber));

    const volumeFields: { label: string; value: string }[] = [];
    const fileIds: number[] = [];
    const directPathFiles: {
      path: string;
      toothnumber: number | null;
      text: string | null;
      section: string | null;
      originalname: string;
    }[] = [];
    const fileMetaMap: Record<
      number,
      { toothnumber: number | null; text: string | null; section: string | null }
    > = {};
    const servicesByToothId = new Map<number, string[]>();

    const materialIds = new Set<number>();
    for (const toothItem of teethData) {
      if (!Array.isArray(toothItem.materials)) continue;
      for (const mat of toothItem.materials as { material?: number }[]) {
        if (typeof mat.material === "number" && mat.material > 0) {
          materialIds.add(mat.material);
        }
      }
    }

    const isRedesignOrder = order.refrence != null;
    const materialInfo = new Map<number, { title: string; price: number }>();
    if (materialIds.size > 0) {
      const materialRows = await db
        .select({
          id: material.id,
          title: material.title,
          price: material.price,
          haveRedesign: material.haveRedesign,
        })
        .from(material)
        .where(inArray(material.id, [...materialIds]));
      for (const row of materialRows) {
        materialInfo.set(row.id, {
          title: row.title || "",
          price: redesignPrice(
            parseDefinedPrice(row.price) ?? 0,
            isRedesignOrder,
            row.haveRedesign ?? false,
          ),
        });
      }
    }

    const materialFileRefs = (mat: {
      file?: unknown;
      files?: unknown;
    }): Array<number | string> => {
      const refs: Array<number | string> = [];
      const seen = new Set<string>();
      const push = (value: unknown) => {
        if (typeof value === "number" && Number.isInteger(value) && value > 0) {
          const key = `n:${value}`;
          if (seen.has(key)) return;
          seen.add(key);
          refs.push(value);
          return;
        }
        if (typeof value === "string" && value.trim()) {
          const key = `s:${value}`;
          if (seen.has(key)) return;
          seen.add(key);
          refs.push(value);
        }
      };
      push(mat.file);
      if (Array.isArray(mat.files)) mat.files.forEach(push);
      return refs;
    };

    for (const toothItem of teethData) {
      if (toothItem.volume && Array.isArray(toothItem.volume)) {
        for (const vol of toothItem.volume) {
          const label = volumeFieldLabel(toothItem.toothnumber, vol);
          if (!label) continue;
          volumeFields.push({
            label,
            value: volumeFieldValue(vol),
          });
        }
      }

      const serviceTitles: string[] = [];
      if (toothItem.materials && Array.isArray(toothItem.materials)) {
        for (const mat of toothItem.materials as {
          material?: number;
          file?: unknown;
          files?: unknown;
          text?: string | null;
        }[]) {
          const info =
            typeof mat.material === "number" ? materialInfo.get(mat.material) : undefined;
          if (info?.title) serviceTitles.push(info.title);

          const toothNumber =
            typeof toothItem.toothnumber === "number" ? toothItem.toothnumber : null;
          const section =
            [
              toothNumber !== null ? `دندان ${toothNumber}` : null,
              info?.title || null,
            ]
              .filter(Boolean)
              .join(" / ") || "فایل متریال";

          for (const ref of materialFileRefs(mat)) {
            if (typeof ref === "number") {
              fileIds.push(ref);
              if (!fileMetaMap[ref]) {
                fileMetaMap[ref] = {
                  toothnumber: toothNumber,
                  text: mat.text ?? null,
                  section,
                };
              }
            } else {
              directPathFiles.push({
                path: ref,
                toothnumber: toothNumber,
                text: mat.text ?? null,
                section,
                originalname: path.basename(ref),
              });
            }
          }
        }
      }
      servicesByToothId.set(toothItem.id, serviceTitles);
    }

    const shadeTitles = teethData
      .map((toothItem) => toothItem.materialshadeTitle)
      .filter((title): title is string => !!title);
    const uniqueShades = [...new Set(shadeTitles)];
    const shadeLabel =
      uniqueShades.length === 0
        ? "-"
        : uniqueShades.length === 1
          ? uniqueShades[0]
          : "طبق هر دندان";

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const downloadableFiles: DownloadableFile[] = [];
    const addedPaths = new Set<string>();

    const orderAttachmentFiles = await db
      .select({
        id: files.id,
        path: files.path,
        originalname: files.originalname,
        mimetype: files.mimetype,
        role: orderFiles.role,
      })
      .from(orderFiles)
      .innerJoin(files, eq(files.id, orderFiles.fileId))
      .where(eq(orderFiles.orderId, +id));

    const roleLabel = (role: string | null) => {
      if (role === "admin") return "فایل ادمین";
      if (role === "designer") return "فایل طراح";
      return "پیوست چک‌اوت";
    };

    for (const file of orderAttachmentFiles) {
      if (!file.path || addedPaths.has(file.path)) continue;
      addedPaths.add(file.path);
      downloadableFiles.push({
        label: roleLabel(file.role),
        name: file.originalname || path.basename(file.path),
        url: buildFileDownloadUrl(baseUrl, file.path),
      });
    }

    if (order.file && !addedPaths.has(order.file)) {
      addedPaths.add(order.file);
      downloadableFiles.push({
        label: "فایل اصلی فرم",
        name: path.basename(order.file),
        url: buildFileDownloadUrl(baseUrl, order.file),
      });
    }

    for (const service of independentServices) {
      const label = service.optionTitle
        ? `${service.serviceTitle} - ${service.optionTitle}`
        : service.serviceTitle;
      for (const file of service.files) {
        if (!file.path || addedPaths.has(file.path)) continue;
        addedPaths.add(file.path);
        downloadableFiles.push({
          label,
          name: file.originalname || path.basename(file.path),
          url: buildFileDownloadUrl(baseUrl, file.path),
        });
      }
    }

    let materialFilesFromDB: {
      id: number;
      path: string;
      originalname: string | null;
      mimetype: string | null;
    }[] = [];

    if (fileIds.length > 0) {
      materialFilesFromDB = await db
        .select({
          id: files.id,
          path: files.path,
          originalname: files.originalname,
          mimetype: files.mimetype,
        })
        .from(files)
        .where(inArray(files.id, fileIds));
    }

    for (const file of materialFilesFromDB) {
      if (addedPaths.has(file.path)) continue;
      addedPaths.add(file.path);
      const meta = fileMetaMap[file.id];
      downloadableFiles.push({
        label: meta?.section || (meta?.toothnumber ? `دندان ${meta.toothnumber}` : "فایل متریال"),
        name: file.originalname || path.basename(file.path),
        url: buildFileDownloadUrl(baseUrl, file.path),
      });
    }

    for (const file of directPathFiles) {
      if (addedPaths.has(file.path)) continue;
      addedPaths.add(file.path);
      downloadableFiles.push({
        label: file.section || (file.toothnumber ? `دندان ${file.toothnumber}` : "فایل متریال"),
        name: file.originalname,
        url: buildFileDownloadUrl(baseUrl, file.path),
      });
    }

    const patientLabel =
      patientFullName(order.patientname, order.patientlastname) || null;
    const billTeeth = teethData.map((toothItem) => ({
      categoryId: Number(toothItem.categoryId) || 0,
      categoryTitle: toothItem.categoryName,
      categoryPrice: redesignPrice(
        parseDefinedPrice(toothItem.categoryPrice) ?? 0,
        isRedesignOrder,
        toothItem.categoryHaveRedesign ?? false,
      ),
      toothNumber: toothItem.toothnumber,
      patientName: patientLabel,
      deviceTitle: toothItem.deviceTitle,
      materials: (Array.isArray(toothItem.materials) ? toothItem.materials : [])
        .map((item: { material?: number }) => {
          const id = Number(item?.material);
          const info = materialInfo.get(id);
          return {
            id,
            title: info?.title ?? "",
            price: info?.price ?? 0,
          };
        })
        .filter((item) => Number.isInteger(item.id) && item.id > 0),
    }));
    const priceParts = [
      ...invoicePriceParts(billTeeth),
      ...independentServicePriceParts(independentServices),
    ];
    const [taxItem] = await db.select().from(tax);
    const [vipItem] = await db.select().from(vip);
    const taxPercent = taxItem ? Number(taxItem.percent || 0) : 0;
    const vipPercent = vipItem ? Number(vipItem.percent || 0) : 0;
    const isVip = order.vip === true;
    const discountToman = Math.max(0, Math.round(Number(order.discountToman ?? 0)));
    const beforeVip = priceParts.reduce((sum, part) => sum + part.beforeTaxToman, 0);
    const vipToman = isVip ? (beforeVip * vipPercent) / 100 : 0;
    const afterDiscount = beforeVip + vipToman - discountToman;
    const paidToman = Math.round(afterDiscount + (afterDiscount * taxPercent) / 100);
    const priced = priceParts.length
      ? buildInvoiceMoney({
          teeth: billTeeth.map((toothItem) => ({
            categoryTitle: toothItem.categoryTitle,
            toothNumber: toothItem.toothNumber,
            patientName: toothItem.patientName,
            deviceTitle: toothItem.deviceTitle,
            beforeTaxToman:
              toothItem.categoryPrice +
              toothItem.materials.reduce((sum, item) => sum + item.price, 0),
          })),
          parts: priceParts,
          isVip,
          vipPercent,
          taxPercent,
          paidToman,
          discountToman,
        })
      : null;
    const priceLines =
      priced && priced.lines[0]?.description !== FALLBACK_LINE_DESCRIPTION
        ? priced.lines
        : [];

    const formData = {
      hiddenField: order.title || "-",
      userType: orderUser ? getUserTypeLabel(orderUser) : "-",
      doctorName: orderUser
        ? `${orderUser.name} ${orderUser.lastName}`.trim()
        : "-",
      patientName:
        patientFullName(order.patientname, order.patientlastname) || "-",
      patientAge: order.patientage != null ? String(order.patientage) : "-",
      gender: getGenderLabel(order.patientgender),
      shade: shadeLabel,
      teeth: teethData.map((t) => ({
        toothnumber: t.toothnumber,
        categoryName: t.categoryName || "-",
        colorLabel: buildToothColorLabel(t),
        deviceTitle: t.deviceTitle || "-",
        services: (servicesByToothId.get(t.id) ?? []).join("، ") || "-",
      })),
      connections: Array.isArray(order.connections)
        ? order.connections.map((connection: unknown) => Number(connection))
        : [],
      volumes: volumeFields,
      downloadableFiles,
      doctorComments: order.comment || "-",
      priceLines,
    };

    const materialImages = [
      ...materialFilesFromDB.map((file) => ({
        filePath: path.join(process.cwd(), file.path),
        meta: fileMetaMap[file.id] ?? null,
        originalname: file.originalname || `File ${file.id}`,
        mimetype: file.mimetype,
      })),
      ...directPathFiles.map((file) => ({
        filePath: path.join(process.cwd(), file.path),
        meta: {
          toothnumber: file.toothnumber,
          text: file.text,
          section: file.section,
        },
        originalname: file.originalname,
        mimetype: null,
      })),
    ];

    const pdfDir = path.join(process.cwd(), "order-pdfs");
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfPath = path.join(pdfDir, `order-${id}-materials.pdf`);
    await generateOrderFormPdfFile(pdfPath, formData, materialImages);

    const relativePath = `order-pdfs/order-${id}-materials.pdf`;
    await db
      .update(orders)
      .set({ userfiles: relativePath })
      .where(eq(orders.id, +id));

    return res.download(pdfPath, `order-${id}-materials.pdf`, (err) => {
      if (err) {
        console.error("Error downloading PDF:", err);
        return errorResponse(res, 500, "Error in file download", err);
      }
    });
  } catch (error) {
    console.error("Error generating material files PDF:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const addOrderToDesigner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { designerId } = req.body;
    const user = (req as any).user;

    // Check if user is admin
    if (user.role !== "admin") {
      return errorResponse(
        res,
        403,
        "You are not authorized to perform this action",
        null,
      );
    }

    // Validate designerId
    if (!designerId) {
      return errorResponse(res, 400, "Designer ID is required", null);
    }

    // Check if order exists
    const [order] = await db.select().from(orders).where(eq(orders.id, +id));

    if (!order) {
      return errorResponse(res, 404, "Order not found", null);
    }

    // Check if designer exists
    const [designer] = await db
      .select()
      .from(users)
      .where(eq(users.id, +designerId));

    if (!designer) {
      return errorResponse(res, 404, "Designer not found", null);
    }

    // Check if designer is not deleted
    if (designer.isDeleted === 0) {
      return errorResponse(res, 400, "Designer is deleted", null);
    }

    if (designer.role !== "designer") {
      return errorResponse(res, 400, "Selected user is not a designer", null);
    }

    if (!order.paymentstatus) {
      await settleUnpaidOrderByAdmin(+id);
    }

    // Assign order to designer
    const [updatedOrder] = await db
      .update(orders)
      .set({ designer_id: +designerId, status: "design" })
      .where(eq(orders.id, +id))
      .returning();

    return successResponse(
      res,
      200,
      {
        order: updatedOrder,
        designer: {
          id: designer.id,
          name: designer.name,
          lastName: designer.lastName,
          email: designer.email,
        },
      },
      "Order assigned to designer successfully",
    );
  } catch (error) {
    console.error("Error assigning order to designer:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const orderlistdesinger = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const filters = readOrderListFilters(req);
    if (!filters.ok) return errorResponse(res, 400, filters.error, null);

    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);
    const whereClause = combineFilters(
      eq(orders.designer_id, user.userId),
      filters.status ? eq(orders.status, filters.status) : undefined,
      filters.paymentStatus
        ? eq(payment.status, filters.paymentStatus)
        : undefined,
      filters.vip === undefined ? undefined : eq(orders.vip, filters.vip),
      matchesText(filters.q, [
        orders.id,
        orders.title,
        orders.patientname,
        orders.patientlastname,
        orders.comment,
      ]),
    );
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .where(whereClause);

    const ordersList = await db
      .select({
        id: orders.id,
        title: orders.title,
        status: orders.status,
        patientname: orders.patientname,
        patientlastname: orders.patientlastname,
        report: orders.report,
        file: orders.file,
        adminFile: orders.adminFile,
        vip: orders.vip,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        doctorName: orderOwner.name,
        doctorLastName: orderOwner.lastName,
      })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .leftJoin(orderOwner, eq(orderOwner.id, orders.user_id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    if (!ordersList.length) {
      return successResponse(
        res,
        200,
        {
          items: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 1,
          },
        },
        "Orders fetched successfully",
      );
    }

    /* ------------------ FILES ------------------ */
    const orderIds = ordersList.map((o) => o.id);
    const { tickets: ticketMap, messageCount } = await loadOrderTickets(orderIds, user.role);
    const allOrderFiles = await db
      .select({
        orderId: orderFiles.orderId,
        fileId: files.id,
        filename: files.filename,
        originalname: files.originalname,
        mimetype: files.mimetype,
        size: files.size,
        path: files.path,
        role: orderFiles.role,
        createdAt: files.createdAt,
      })
      .from(orderFiles)
      .innerJoin(files, eq(files.id, orderFiles.fileId))
      .where(inArray(orderFiles.orderId, orderIds));

    const filesByOrderId = allOrderFiles.reduce<
      Record<number, typeof allOrderFiles>
    >((acc, f) => {
      if (!acc[f.orderId]) acc[f.orderId] = [];
      acc[f.orderId].push(f);
      return acc;
    }, {});
    const independentByOrder = await loadIndependentServicesByOrders(db, orderIds);

    /* ------------------ CATEGORIES ------------------ */
    const ordersWithCategories = await Promise.all(
      ordersList.map(async (order) => {
        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, order.id));

        const teethIds = teethRelations.map((t) => t.toothId);
        const orderFilesList = filesByOrderId[order.id] ?? [];

        if (!teethIds.length) {
          return {
            ...order,
            teeth: [],
            independentServices: independentByOrder.get(order.id) ?? [],
            files: orderFilesList,
            tickets: ticketMap.get(order.id) ?? [],
            messageCount: messageCount.get(order.id) ?? 0,
          };
        }

        const teethCategories = await db
          .select({
            tooth: tooth.toothnumber,
            categoryId: tooth.category,
            categoryName: category.title,
            device: {
              title: device.title,
            },
            materialshade: {
              title: materialshade.title,
            },
            volume: tooth.volume,
          })
          .from(tooth)
          .leftJoin(category, eq(tooth.category, category.id))
          .leftJoin(device, eq(tooth.device, device.id))
          .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
          .where(inArray(tooth.id, teethIds));

        return {
          ...order,
          teeth: teethCategories,
          independentServices: independentByOrder.get(order.id) ?? [],
          files: orderFilesList,
          tickets: ticketMap.get(order.id) ?? [],
          messageCount: messageCount.get(order.id) ?? 0,
        };
      }),
    );

    return successResponse(
      res,
      200,
      {
        items: ordersWithCategories,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "list fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const uploadOrderAttachment = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return errorResponse(res, 400, "فایل الزامی است", null);
    }

    const user = (req as any).user;
    const storedPath = file.path.replace(/\\/g, "/");
    const [record] = await db
      .insert(files)
      .values({
        filename: path.basename(storedPath).slice(0, 255),
        originalname: (file.originalname || path.basename(storedPath)).slice(0, 255),
        mimetype: (file.mimetype || "application/octet-stream").slice(0, 100),
        size: file.size,
        path: storedPath,
        user_id: user?.userId || user?.id || null,
      })
      .returning();

    return successResponse(res, 200, record, "File uploaded successfully");
  } catch (error) {
    console.error("Error uploading order file:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};
