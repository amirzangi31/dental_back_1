import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../../utils/responses";
import { db } from "../../../db";
import { orders, OrderStatus, orderTeeth } from "../../../db/schema/orders";
import { tooth } from "../../../db/schema/tooth";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { calculateTeethTotalPrice } from "../../../utils/calculateTeethPrice";
import { category } from "../../../db/schema/category";
import { device } from "../../../db/schema/device";
import { materialshade } from "../../../db/schema/materialshade";
import { volume } from "../../../db/schema/volume";
import { color } from "../../../db/schema/color";
import { files } from "../../../db/schema/files";
import path from "path";
import fs from "fs";
import { vip } from "../../../db/schema/vip";
import { getPagination } from "../../../utils/pagination";
import { payment, PaymentStatus } from "../../../db/schema/payment";
import { tax } from "../../../db/schema/tax";
import { material } from "../../../db/schema/material";
import { users } from "../../../db/schema/users";
export const createOrder = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const {
      title,
      patientname,
      patientage,
      patientgender,
      report,
      paymentstatus,
      comment,
      file,
      discount,
      vip: vipParametr,
      teeth,
      connections,
      antagonists,
    } = req.body;

    // ---------- validate teeth ----------
    if (!teeth || !Array.isArray(teeth) || teeth.length === 0)
      return errorResponse(
        res,
        400,
        "At least one tooth must be selected",
        null,
      );

    // ---------- create teeth values & compute prices ----------
    let totalPrice = 0;
    let hasMissingPrice = false;
    const teethValues = teeth.map((t: any) => {
      const materialsData =
        t.materials && Array.isArray(t.materials)
          ? t.materials.map((mat: any) => ({
              material: mat.material || null,
              file: mat.file || null,
              text: mat.text || null,
            }))
          : [];

      return {
        toothnumber: +t.toothnumber || null,
        category: +t.category || null,
        device: +t.device || null,
        materialshade: +t.materialshade || null,
        materials: materialsData,
        volume: t.volume || [],
      };
    });

    // Calculate total price: category + materials (without volume)
    for (let i = 0; i < teeth.length; i++) {
      const t = teeth[i];
      let toothPrice = 0;

      // Category price
      if (t.category) {
        const [categoryItem] = await db
          .select({ price: category.price })
          .from(category)
          .where(eq(category.id, +t.category))
          .limit(1);

        if (
          categoryItem &&
          categoryItem.price &&
          categoryItem.price !== "0.00"
        ) {
          toothPrice += Number(categoryItem.price);
        } else {
          hasMissingPrice = true;
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

            if (
              materialItem &&
              materialItem.price &&
              materialItem.price !== "0.00"
            ) {
              toothPrice += Number(materialItem.price);
            } else {
              hasMissingPrice = true;
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
    const vipPrice = vipItem ? Number(vipItem.price || 0) : 0;

    // Calculate final total: subtotal + VIP + Tax
    const isVip = vipParametr === "true" || vipParametr === true;
    if (hasMissingPrice) {
      totalPrice = 0;
    }
    const vipAmount = isVip && !hasMissingPrice ? vipPrice : 0;
    const totalBeforeTax = totalPrice + vipAmount;
    const taxAmount = hasMissingPrice ? 0 : (totalBeforeTax * taxPercent) / 100;
    const finalTotal = hasMissingPrice ? 0 : totalBeforeTax + taxAmount;

    // ---------- create order ----------
    const [createdOrder]: any = await db
      .insert(orders)
      .values({
        title: title || null,
        user_id: user.userId,
        patientname: patientname || null,
        patientage: patientage ? parseInt(patientage, 10) : null,
        patientgender: patientgender || null,
        report: report ? parseInt(report, 10) : null,
        status: "uploadfile" as OrderStatus,
        totalaprice: String(finalTotal),
        paymentstatus: paymentstatus || false,
        comment: comment || null,
        file: file || null,
        discount: discount ? parseInt(discount, 10) : null,
        vip: vipParametr === "true" || vipParametr === true || false,
        connections: connections || [],
        antagonists: antagonists || [],
      })
      .returning();

    // ---------- create teeth ----------
    const createdTeeth = await db.insert(tooth).values(teethValues).returning();

    // ---------- insert orderTeeth ----------
    const orderTeethData = createdTeeth.map((t) => ({
      orderId: createdOrder.id,
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
        let toothTotalPrice = Number(t.categoryPrice ?? 0);

        if (t.materials && Array.isArray(t.materials)) {
          for (const mat of t.materials) {
            if (mat.material) {
              const [materialItem] = await db
                .select({ price: material.price })
                .from(material)
                .where(eq(material.id, mat.material))
                .limit(1);

              if (
                materialItem &&
                materialItem.price &&
                materialItem.price !== "0.00"
              ) {
                toothTotalPrice += Number(materialItem.price);
              }else if(materialItem.price === "0.00") {
                toothTotalPrice = 0;
                break;
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

    const [createdPayment] = await db
      .insert(payment)
      .values({
        order_id: createdOrder.id,
        type: "uploadfile",
        status: "pending",
      })
      .returning();

    return successResponse(
      res,
      200,
      {
        order: createdOrder,
        teeth: finalTeeth,
        teethIds,
        payment: createdPayment,
        vip: vipPrice || 0,
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

    if (teethRelations.length === 0) {
      return errorResponse(res, 404, "Teeth not found", null);
    }

    const teethIds = teethRelations.map((t) => t.toothId);

    const teethData = await db
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
        color: color.id,
        materials: tooth.materials,
      })
      .from(tooth)
      .leftJoin(category, eq(tooth.category, category.id))
      .leftJoin(device, eq(tooth.device, device.id))
      .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
      .leftJoin(color, eq(category.color, color.id))
      .where(inArray(tooth.id, teethIds));

    // دریافت Tax و VIP
    const [taxItem] = await db.select().from(tax);
    const taxPercent = taxItem ? Number(taxItem.percent || 0) : 0;

    const [vipItem] = await db.select().from(vip);
    const vipPrice = vipItem ? Number(vipItem.price || 0) : 0;

    // ساخت خروجی مشابه ToothType interface
    const teethDetails: any[] = [];
    let hasMissingPrice = false;
    let subtotal = 0;

    for (const toothData of teethData) {
      // محاسبه قیمت دندان
      let categoryPriceNum = 0;
      let materialsTotal = 0;
      let toothHasMissingPrice = false;

      if (toothData.categoryPrice && toothData.categoryPrice !== "0.00") {
        categoryPriceNum = Number(toothData.categoryPrice);
      } else {
        toothHasMissingPrice = true;
        hasMissingPrice = true;
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
              const materialPrice =
                materialItem.price !== "0.00"
                  ? Number(materialItem.price)
                  : null;

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
              price: toothData.categoryPrice
                ? Number(toothData.categoryPrice)
                : null,
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

    // محاسبه summary
    const isVip = order.vip === true;
    const finalSubtotal = hasMissingPrice ? 0 : subtotal;
    const vipAmount = !hasMissingPrice && isVip ? vipPrice : 0;
    const totalBeforeTax = finalSubtotal + vipAmount;
    const taxAmount = hasMissingPrice ? 0 : (totalBeforeTax * taxPercent) / 100;
    const finalTotal = hasMissingPrice ? 0 : totalBeforeTax + taxAmount;

    return successResponse(
      res,
      200,
      {
        order: order,
        teeth: teethDetails,
        summary: {
          subtotal: finalSubtotal,
          vip: vipAmount,
          taxPercent: taxPercent,
          taxAmount: taxAmount,
          total: finalTotal,
          hasMissingPrice: hasMissingPrice,
          vipInfo: vipItem
            ? {
                price: vipItem.price,
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
      patientage,
      patientgender,
      comment,
      file,
      discount,
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
              Object.keys(fileValue).length === 0);
          if (isFileEmpty) {
            fileValue = originalMat.file || null;
          }

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
            file: fileValue,
            text: textValue,
          };
        });
      } else {
        // materials جدید خالی است، کامل از order اصلی کپی کن
        materialsData = originalMaterials.map((mat: any) => ({
          material: mat.material || null,
          file: mat.file || null,
          text: mat.text || null,
        }));
      }

      // device و materialshade: اگر جدید نیامده از قدیمی استفاده کن
      const deviceValue =
        t.device !== undefined && t.device !== null
          ? +t.device
          : originalTooth?.device || null;
      const materialshadeValue =
        t.materialshade !== undefined && t.materialshade !== null
          ? +t.materialshade
          : originalTooth?.materialshade || null;

      return {
        toothnumber: +t.toothnumber || null,
        category: +t.category || null,
        device: deviceValue,
        materialshade: materialshadeValue,
        materials: materialsData,
        volume: t.volume || originalTooth?.volume || [],
      };
    });

    for (let i = 0; i < teeth.length; i++) {
      const t = teeth[i];
      let toothPrice = 0;

      // Category price
      if (t.category) {
        const [categoryItem] = await db
          .select({ price: category.price })
          .from(category)
          .where(eq(category.id, +t.category))
          .limit(1);

        if (
          categoryItem &&
          categoryItem.price &&
          categoryItem.price !== "0.00"
        ) {
          toothPrice += Number(categoryItem.price);
        }
      }

      if (t.materials && Array.isArray(t.materials)) {
        for (const mat of t.materials) {
          if (mat.material) {
            const [materialItem] = await db
              .select({ price: material.price })
              .from(material)
              .where(eq(material.id, mat.material))
              .limit(1);

            if (
              materialItem &&
              materialItem.price &&
              materialItem.price !== "0.00"
            ) {
              toothPrice += Number(materialItem.price);
            }
          }
        }
      }

      totalPrice += toothPrice;
    }

    const [taxItem] = await db.select().from(tax);
    const taxPercent = taxItem ? Number(taxItem.percent || 0) : 0;

    const [vipItem] = await db.select().from(vip);
    const vipPrice = vipItem ? Number(vipItem.price || 0) : 0;

    const halfPrice = totalPrice / 2;

    const isVip = vipParametr === "true" || vipParametr === true;
    const vipAmount = isVip ? vipPrice : 0;
    const totalBeforeTax = halfPrice + vipAmount;
    const taxAmount = (totalBeforeTax * taxPercent) / 100;
    const finalTotal = totalBeforeTax + taxAmount;

    const [createdOrder]: any = await db
      .insert(orders)
      .values({
        title: title || originalOrder.title || null,
        user_id: user.userId,
        patientname: patientname || originalOrder.patientname || null,
        patientage: patientage
          ? parseInt(patientage, 10)
          : originalOrder.patientage || null,
        patientgender: patientgender || originalOrder.patientgender || null,
        report: null,
        status: "uploadfile" as OrderStatus,
        totalaprice: String(finalTotal),
        paymentstatus: false,
        comment: comment || null,
        // اگر فایل جدید نیامده، از فایل order اصلی استفاده کن
        file: file || originalOrder.file || null,
        discount: discount
          ? parseInt(discount, 10)
          : originalOrder.discount || null,
        vip: vipParametr === "true" || vipParametr === true || false,
        connections: originalOrder.connections || [],
        antagonists: originalOrder.antagonists || [],
        refrence: +id,
      })
      .returning();

    const createdTeeth = await db.insert(tooth).values(teethValues).returning();

    const orderTeethData = createdTeeth.map((t) => ({
      orderId: createdOrder.id,
      toothId: t.id,
    }));
    if (orderTeethData.length)
      await db.insert(orderTeeth).values(orderTeethData);

    const teethIds = createdTeeth.map((t) => t.id);

    const detailedTeeth = await db
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
      .where(inArray(tooth.id, teethIds));

    const finalTeeth = await Promise.all(
      detailedTeeth.map(async (t) => {
        let toothTotalPrice = Number(t.categoryPrice ?? 0);

        if (t.materials && Array.isArray(t.materials)) {
          for (const mat of t.materials) {
            if (mat.material) {
              const [materialItem] = await db
                .select({ price: material.price })
                .from(material)
                .where(eq(material.id, mat.material))
                .limit(1);

              if (
                materialItem &&
                materialItem.price &&
                materialItem.price !== "0.00"
              ) {
                toothTotalPrice += Number(materialItem.price);
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

    const [createdPayment] = await db
      .insert(payment)
      .values({
        order_id: createdOrder.id,
        type: "uploadfile",
        status: "pending",
      })
      .returning();

    return successResponse(
      res,
      200,
      {
        order: createdOrder,
        teeth: finalTeeth,
        teethIds,
        payment: createdPayment,
        vip: vipPrice || 0,
        originalOrderId: +id,
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
      patientage,
      patientgender,
      report,
      status,
      paymentstatus,
      comment,
      file,
      discount,
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

    if (!teeth || !Array.isArray(teeth) || teeth.length === 0)
      return errorResponse(
        res,
        400,
        "At least one tooth must be selected",
        null,
      );

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

    // ---------- create new teeth & compute prices ----------
    const teethValues = teeth.map((t: any) => ({
      toothnumber: +t.toothnumber || null,
      category: +t.category || null,
      device: +t.device || null,
      materialshade: +t.materialshade || null,
      volume: t.volume || [],
    }));

    const totalPrice = await calculateTeethTotalPrice(db, teethValues, {
      category,
      device,
      materialshade,
      volume,
    });

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
        patientage: patientage ? parseInt(patientage, 10) : null,
        patientgender: patientgender || null,
        report: report ? parseInt(report, 10) : null,
        status: status || "uploadfile",
        totalaprice: String(totalPrice),
        paymentstatus: paymentstatus || false,
        comment,
        file,
        discount: discount ? parseInt(discount, 10) : null,
        vip: vipParametr === "true" || false,
        connections: connections || [],
        antagonists: antagonists || [],
      })
      .where(eq(orders.id, +id))
      .returning();
    const [vipPrice] = await db.select({ price: vip.price }).from(vip);

    return successResponse(
      res,
      200,
      {
        order: updatedOrder,
        teeth: finalTeeth,
        teethIds,
        vip: vipPrice ? vipPrice.price : 0,
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
    const file = req.file;
    if (file) {
      const fileRecord = await db
        .insert(files)
        .values({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          user_id: (req as any).user?.id || null,
        })
        .returning();
    }
    if (!order.length) return errorResponse(res, 404, "Order not found", null);
    if (order[0].user_id !== user.userId)
      return errorResponse(
        res,
        403,
        "You are not authorized to submit this order",
        null,
      );

    if (order[0].paymentstatus)
      return errorResponse(res, 400, "Order is already paid", null);
    const paymentItem = await db
      .select()
      .from(payment)
      .where(eq(payment.order_id, +id));
    if (paymentItem.length) {
      return errorResponse(res, 400, "Payment already exists", null);
    }
    await db.insert(payment).values({
      order_id: +id,
      type: "uploadfile",
      status: "pending",
    });
    await db
      .update(orders)
      .set({
        comment: comment || null,
        file: file ? file.path : null,
        status: "design" as OrderStatus,
        vip: vip,
      })
      .where(eq(orders.id, +id));

    return successResponse(res, 200, {}, "Order submitted successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const orderList = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);

    const { isDelivered, paymentStatus } = req.query as {
      isDelivered?: string;
      paymentStatus?: PaymentStatus;
    };

    /* ------------------ WHERE CONDITIONS ------------------ */
    const whereConditions = [
      eq(orders.user_id, user.userId),
      eq(orders.isDeleted, 0),
    ];

    // if (isDelivered !== undefined) {
    //   whereConditions.push(eq(orders.isDelivered, isDelivered === "true"));
    // }

    const paymentStatusCondition = paymentStatus
      ? eq(payment.status, paymentStatus)
      : undefined;

    /* ------------------ TOTAL COUNT ------------------ */
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .where(and(...whereConditions, paymentStatusCondition));

    /* ------------------ ORDERS LIST ------------------ */
    const ordersList = await db
      .select({
        id: orders.id,
        title: orders.title,
        status: orders.status,
        paymentstatus: orders.paymentstatus,
        totalaprice: orders.totalaprice,
        comment: orders.comment,
        file: orders.file,
        adminFile: orders.adminFile,
        discount: orders.discount,
        vip: orders.vip,
        deliveryDate: orders.deliveryDate,
        report: orders.report,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        refrence: orders.refrence,
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
      .where(and(...whereConditions, paymentStatusCondition))
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

    /* ------------------ CATEGORIES ------------------ */
    const ordersWithCategories = await Promise.all(
      ordersList.map(async (order) => {
        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, order.id));

        const teethIds = teethRelations.map((t) => t.toothId);

        if (!teethIds.length) {
          return { ...order, categories: [] };
        }

        const teethCategories = await db
          .select({
            categoryId: tooth.category,
            categoryName: category.title,
          })
          .from(tooth)
          .leftJoin(category, eq(tooth.category, category.id))
          .where(inArray(tooth.id, teethIds));

        const uniqueCategories = teethCategories.reduce<
          { categoryId: number | null; categoryName: string | null }[]
        >((acc, c) => {
          if (!acc.find((x) => x.categoryId === c.categoryId)) {
            acc.push(c);
          }
          return acc;
        }, []);

        return {
          ...order,
          categories: uniqueCategories,
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

    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .where(eq(orders.user_id, user.userId));

    const ordersList = await db
      .select({
        id: orders.id,
        title: orders.patientname,
      })
      .from(orders)
      .where(eq(orders.user_id, user.userId))
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

    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);

    const { isDelivered, paymentStatus } = req.query as {
      isDelivered?: string;
      paymentStatus?: PaymentStatus;
    };

    /* ------------------ WHERE CONDITIONS ------------------ */
    const whereConditions = [eq(orders.isDeleted, 0)];

    // if (isDelivered !== undefined) {
    //   whereConditions.push(eq(orders.isDelivered, isDelivered === "true"));
    // }

    const paymentStatusCondition = paymentStatus
      ? eq(payment.status, paymentStatus)
      : undefined;

    /* ------------------ TOTAL ------------------ */
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .where(and(...whereConditions, paymentStatusCondition));

    /* ------------------ ORDERS ------------------ */
    const ordersList = await db
      .select()
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .leftJoin(users, eq(users.id, orders.designer_id))
      .where(and(...whereConditions, paymentStatusCondition))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    /* ------------------ CATEGORIES + PAYMENT (OUTPUT SAME) ------------------ */
    const ordersWithCategories = await Promise.all(
      ordersList.map(async ({ orders: order }) => {
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
          categories: teethCategories,
          payment: paymentItem[0] || null,
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
    const file = req.file;
    if (file) {
      const fileRecord = await db
        .insert(files)
        .values({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          user_id: (req as any).user?.id || null,
        })
        .returning();
    }
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, +orderId));
    if (!order) return errorResponse(res, 404, "Order not found", null);

    const vipPrice = await db.select({ price: vip.price }).from(vip);
    if (vipPrice.length === 0) {
      return errorResponse(res, 404, "VIP price not found", null);
    }

    const [currentOrder] = await db
      .select({ adminFile: orders.adminFile })
      .from(orders)
      .where(eq(orders.id, +orderId))
      .limit(1);

    const adminFileValue = file ? file.path : (currentOrder?.adminFile || null);

    await db
      .update(orders)
      .set({
        status: status as OrderStatus,
        adminFile: adminFileValue,
        totalaprice: String(Number(totalPrice) + Number(vipPrice[0]?.price)),
        paymentstatus: status !== "uploadfile" ? true : false,
      })
      .where(eq(orders.id, +orderId));

    if (status !== "uploadfile") {
      await db
        .update(payment)
        .set({
          status: "paid",
          updatedAt: new Date(),
        })
        .where(eq(payment.order_id, +orderId));
    } else if (status === "uploadfile") {
      await db
        .update(payment)
        .set({
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(payment.order_id, +orderId));
    }

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
    const file = req.file;
    console.log("file : ----", file);
    if (file) {
      const fileRecord = await db
        .insert(files)
        .values({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          user_id: (req as any).user?.id || null,
        })
        .returning();
    }
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, +orderId));
    if (!order) return errorResponse(res, 404, "Order not found", null);

    await db
      .update(orders)
      .set({
        status: "design" as OrderStatus,
        adminFile: file ? file.path : null,
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
    const { isConfirm } = req.query;
    const user = (req as any).user;

    const [order] = await db
      .select({ adminFile: orders.adminFile, user_id: orders.user_id })
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

    if (!order.adminFile) {
      return errorResponse(
        res,
        404,
        "Admin file not found for this order",
        null,
      );
    }
    if(isConfirm === "1"){
      await db
      .update(orders)
      .set({
        deliveryDate: new Date(),
        status: "finaldelivery" as OrderStatus,
      })
      .where(eq(orders.id, +orderId));
    }


    const filePath = path.join(process.cwd(), order.adminFile);

    return res.download(filePath, (err) => {
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

export const calculateOrderPrice = async (req: Request, res: Response) => {
  try {
    const { teeth, vip: vipParametr } = req.body;
    if (!teeth || !Array.isArray(teeth)) {
      return errorResponse(res, 400, "Invalid order data", null);
    }

    const [taxItem] = await db.select().from(tax);
    const taxPercent = taxItem ? Number(taxItem.percent || 0) : 0;

    const [vipItem] = await db.select().from(vip);
    const vipPrice = vip && vipItem ? Number(vipItem.price || 0) : 0;

    const teethDetails: any[] = [];
    let hasMissingPrice = false;
    let subtotal = 0;

    for (const toothData of teeth) {
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
          })
          .from(category)
          .leftJoin(color, eq(category.color, color.id))
          .where(eq(category.id, toothData.category));

        if (categoryItem) {
          toothDetail.categoryDetail = {
            id: categoryItem.id,
            title: categoryItem.title,
            color: categoryItem.color,
            price: categoryItem.price ? Number(categoryItem.price) : null,
          };

          if (categoryItem.price !== "0.00") {
            toothDetail.categoryPrice = Number(categoryItem.price);
          } else {
            toothDetail.hasMissingPrice = true;
            hasMissingPrice = true;
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
              const materialPrice =
                materialItem.price !== "0.00"
                  ? Number(materialItem.price)
                  : null;
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

    const finalSubtotal = hasMissingPrice ? 0 : subtotal;
    const vipAmount = !hasMissingPrice || !vipParametr ? 0 : vipPrice;
    const totalBeforeTax = finalSubtotal + vipAmount;
    const taxAmount = hasMissingPrice ? 0 : (totalBeforeTax * taxPercent) / 100;
    const finalTotal = hasMissingPrice ? 0 : totalBeforeTax + taxAmount;

    return successResponse(
      res,
      200,
      {
        teeth: teethDetails,
        summary: {
          subtotal: finalSubtotal,
          vip: vipAmount,
          taxPercent: taxPercent,
          taxAmount: taxAmount,
          total: finalTotal,
          hasMissingPrice: hasMissingPrice,
          vipInfo: vipItem
            ? {
                price: vipItem.price,
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

    // Get order
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

    // Check if PDF already exists
    if (order.userfiles) {
      const pdfPath = path.join(process.cwd(), order.userfiles);
      if (fs.existsSync(pdfPath)) {
        return res.download(pdfPath, `order-${id}-materials.pdf`, (err) => {
          if (err) {
            console.error("Error downloading existing PDF:", err);
            // Continue to regenerate if download fails
          }
        });
      }
    }

    // Get all teeth for the order
    const teethRelations = await db
      .select()
      .from(orderTeeth)
      .where(eq(orderTeeth.orderId, +id));

    if (teethRelations.length === 0) {
      return errorResponse(res, 404, "No teeth found for this order", null);
    }

    const teethIds = teethRelations.map((t) => t.toothId);

    // Get teeth with materials
    const teethData = await db
      .select({
        id: tooth.id,
        toothnumber: tooth.toothnumber,
        materials: tooth.materials,
      })
      .from(tooth)
      .where(inArray(tooth.id, teethIds));

    // Extract all material files - both IDs and direct paths
    const fileIds: number[] = [];
    const directPathFiles: {
      path: string;
      toothnumber: number | null;
      text: string | null;
      originalname: string;
    }[] = [];
    const fileMetaMap: Record<
      number,
      { toothnumber: number | null; text: string | null }
    > = {};

    teethData.forEach((t) => {
      if (t.materials && Array.isArray(t.materials)) {
        t.materials.forEach((mat: any) => {
          if (mat.file) {
            // اگر file یک عدد است (id از جدول files)
            if (typeof mat.file === "number") {
              fileIds.push(mat.file);
              if (!fileMetaMap[mat.file]) {
                fileMetaMap[mat.file] = {
                  toothnumber:
                    typeof t.toothnumber === "number" ? t.toothnumber : null,
                  text: mat.text ?? null,
                };
              }
            }
            // اگر file یک رشته است (مسیر مستقیم فایل)
            else if (typeof mat.file === "string" && mat.file.length > 0) {
              directPathFiles.push({
                path: mat.file,
                toothnumber:
                  typeof t.toothnumber === "number" ? t.toothnumber : null,
                text: mat.text ?? null,
                originalname: path.basename(mat.file),
              });
            }
          }
        });
      }
    });

    // اگر نه id و نه مسیر مستقیم وجود نداشت
    if (fileIds.length === 0 && directPathFiles.length === 0) {
      return errorResponse(
        res,
        404,
        "No material files found for this order",
        null,
      );
    }

    // Get file paths from files table (برای فایل‌هایی که id دارند)
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

    // Create PDF directory if it doesn't exist
    const pdfDir = path.join(process.cwd(), "order-pdfs");
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Generate PDF
    const PDFDocument = require("pdfkit");
    const pdfPath = path.join(pdfDir, `order-${id}-materials.pdf`);
    const doc = new PDFDocument({ margin: 50 });

    // Register a font that supports Farsi (Persian) if available
    // توجه: حتماً فایل فونت را در مسیر زیر قرار بده یا مسیر را با ساختار پروژه‌ات هماهنگ کن
    const faFontPath = path.join(
      process.cwd(),
      "assets",
      "fonts",
      "IRANSansX-Medium.ttf",
    );
    if (fs.existsSync(faFontPath)) {
      doc.registerFont("fa", faFontPath);
      doc.font("fa");
    }

    // Pipe PDF to file
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Add images to PDF
    let imageCount = 0;

    // Helper function to add image to PDF
    const addImageToPDF = (
      filePath: string,
      meta: { toothnumber: number | null; text: string | null } | null,
      originalname: string,
      mimetype: string | null,
    ) => {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return false;
      }

      // Check if it's an image (by mimetype or extension)
      const isImage =
        mimetype?.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filePath);

      if (isImage) {
        try {
          // Add page break for subsequent images
          if (imageCount > 0) {
            doc.addPage();
          }

          if (meta) {
            if (meta.toothnumber !== null && meta.toothnumber !== undefined) {
              doc.moveDown(0.5);
              doc.fontSize(16).text(`Tooth Number: ${meta.toothnumber}`, {
                align: "center",
              });
            }

            if (meta.text) {
              doc.moveDown(0.5);
              doc.fontSize(12).text(`Description: ${meta.text}`, {
                align: "center",
              });
            }
          }

          doc.moveDown(1);

          doc.image(filePath, {
            fit: [500, 500],
            align: "center",
            valign: "center",
          });

          doc.moveDown();
          doc.fontSize(10).text(originalname || path.basename(filePath), {
            align: "center",
          });

          imageCount++;
          return true;
        } catch (imageError) {
          console.error(`Error adding image ${filePath}:`, imageError);
          return false;
        }
      }
      return false;
    };

    // 1. اضافه کردن فایل‌هایی که از دیتابیس آمده‌اند (با id)
    for (const file of materialFilesFromDB) {
      const filePath = path.join(process.cwd(), file.path);
      const meta = fileMetaMap[file.id];
      addImageToPDF(
        filePath,
        meta,
        file.originalname || `File ${file.id}`,
        file.mimetype,
      );
    }

    // 2. اضافه کردن فایل‌هایی که مسیر مستقیم دارند
    for (const file of directPathFiles) {
      const filePath = path.join(process.cwd(), file.path);
      const meta = { toothnumber: file.toothnumber, text: file.text };
      addImageToPDF(filePath, meta, file.originalname, null);
    }

    // Finalize PDF
    doc.end();

    // Wait for PDF to be written
    await new Promise<void>((resolve, reject) => {
      stream.on("finish", () => {
        resolve();
      });
      stream.on("error", (err: Error) => {
        reject(err);
      });
    });

    if (imageCount === 0) {
      // Delete empty PDF
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
      return errorResponse(
        res,
        404,
        "No valid image files found to create PDF",
        null,
      );
    }

    // Save PDF path to userfiles column
    const relativePath = `order-pdfs/order-${id}-materials.pdf`;
    await db
      .update(orders)
      .set({ userfiles: relativePath })
      .where(eq(orders.id, +id));

    // Return PDF
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

    // Assign order to designer
    const [updatedOrder] = await db
      .update(orders)
      .set({ designer_id: +designerId, status: "design" })
      .where(eq(orders.id, +id))
      .returning();

    await db
      .update(payment)
      .set({
        status: "paid",
        updatedAt: new Date(),
      })
      .where(eq(payment.order_id, +id));

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
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.designer_id));

    const ordersList = await db
      .select({
        id: orders.id,
        title: orders.title,
        file: orders.file,
        adminFile: orders.adminFile,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .where(eq(orders.designer_id, user.userId))
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

    /* ------------------ CATEGORIES ------------------ */
    const ordersWithCategories = await Promise.all(
      ordersList.map(async (order) => {
        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, order.id));

        const teethIds = teethRelations.map((t) => t.toothId);

        if (!teethIds.length) {
          return { ...order, categories: [] };
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
