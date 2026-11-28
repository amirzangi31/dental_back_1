import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { invoice, invoiceLine } from "../../../db/schema/invoice";
import { orders, orderTeeth } from "../../../db/schema/orders";
import { tooth } from "../../../db/schema/tooth";
import { category } from "../../../db/schema/category";
import { device } from "../../../db/schema/device";
import { material } from "../../../db/schema/material";
import { vip } from "../../../db/schema/vip";
import {
  buildInvoiceMoney,
  FALLBACK_LINE_DESCRIPTION,
  InvoiceDocument,
  invoicePriceParts,
  mentionDevicesInDescription,
  toInvoiceDocument,
} from "./invoiceDocument";
import { redesignPrice } from "../../../utils/redesignPrice";
import {
  independentServicePriceParts,
  loadIndependentServicesByOrders,
} from "../independentService/resolveSelection";

const devicesByToothNumber = async (orderId: number, executor: any) => {
  const rows = await executor
    .select({
      toothnumber: tooth.toothnumber,
      deviceTitle: device.title,
    })
    .from(orderTeeth)
    .innerJoin(tooth, eq(orderTeeth.toothId, tooth.id))
    .leftJoin(device, eq(tooth.device, device.id))
    .where(eq(orderTeeth.orderId, orderId));

  const devices = new Map<number, string>();
  for (const row of rows) {
    const title = row.deviceTitle?.trim();
    if (row.toothnumber === null || row.toothnumber === undefined || !title) continue;
    devices.set(row.toothnumber, title);
  }
  return devices;
};

const finiteNumber = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const materialIdsOf = (
  materials: { material?: number | null }[] | null | undefined,
) => {
  if (!Array.isArray(materials)) return [];
  return materials
    .map((item) => Number(item?.material))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const withPriceDetails = async (document: InvoiceDocument, executor: any) => {
  const [order] = await executor
    .select()
    .from(orders)
    .where(eq(orders.id, document.orderId));
  if (!order) return document;
  const isRedesignOrder = order.refrence != null;

  const [vipItem] = await executor.select().from(vip);
  const teeth = await executor
    .select({
      toothnumber: tooth.toothnumber,
      categoryId: category.id,
      categoryTitle: category.title,
      categoryPrice: category.price,
      categoryHaveRedesign: category.haveRedesign,
      deviceTitle: device.title,
      materials: tooth.materials,
    })
    .from(orderTeeth)
    .innerJoin(tooth, eq(orderTeeth.toothId, tooth.id))
    .leftJoin(category, eq(tooth.category, category.id))
    .leftJoin(device, eq(tooth.device, device.id))
    .where(eq(orderTeeth.orderId, document.orderId))
    .orderBy(asc(tooth.id));

  const materialIds = [
    ...new Set(
      teeth.flatMap((row: { materials: { material?: number | null }[] }) =>
        materialIdsOf(row.materials),
      ),
    ),
  ];
  const materialRows = materialIds.length
    ? await executor
        .select({
          id: material.id,
          title: material.title,
          price: material.price,
          haveRedesign: material.haveRedesign,
        })
        .from(material)
        .where(inArray(material.id, materialIds))
    : [];
  const priceByMaterial = new Map<number, number>(
    materialRows.map((row: { id: number; price: string | null; haveRedesign: boolean | null }) => [
      row.id,
      redesignPrice(finiteNumber(row.price), isRedesignOrder, Boolean(row.haveRedesign)),
    ]),
  );
  const titleByMaterial = new Map<number, string>(
    materialRows.map((row: { id: number; title: string | null }) => [row.id, row.title ?? ""]),
  );
  const patientName =
    [order.patientname, order.patientlastname].filter(Boolean).join(" ") || null;
  const billTeeth = teeth.map((row: {
    toothnumber: number | null;
    categoryId: number | null;
    categoryTitle: string | null;
    categoryPrice: string | null;
    categoryHaveRedesign: boolean | null;
    deviceTitle: string | null;
    materials: { material?: number | null }[] | null;
  }) => ({
    categoryId: Number(row.categoryId) || 0,
    categoryTitle: row.categoryTitle,
    categoryPrice: redesignPrice(
      finiteNumber(row.categoryPrice),
      isRedesignOrder,
      Boolean(row.categoryHaveRedesign),
    ),
    toothNumber: row.toothnumber,
    patientName,
    deviceTitle: row.deviceTitle,
    materials: materialIdsOf(row.materials).map((id) => ({
      id,
      title: titleByMaterial.get(id) ?? "",
      price: priceByMaterial.get(id) ?? 0,
    })),
  }));
  const serviceItems = (
    await loadIndependentServicesByOrders(executor, [document.orderId])
  ).get(document.orderId) ?? [];
  const parts = [
    ...invoicePriceParts(billTeeth),
    ...independentServicePriceParts(serviceItems),
  ];
  if (parts.length === 0) return document;

  const money = buildInvoiceMoney({
    teeth: billTeeth.map((row: {
      categoryTitle: string | null;
      toothNumber: number | null;
      patientName: string | null;
      deviceTitle: string | null;
      categoryPrice: number;
      materials: { price: number }[];
    }) => ({
      categoryTitle: row.categoryTitle,
      toothNumber: row.toothNumber,
      patientName: row.patientName,
      deviceTitle: row.deviceTitle,
      beforeTaxToman:
        row.categoryPrice + row.materials.reduce((sum, item) => sum + item.price, 0),
    })),
    parts,
    isVip: order.vip === true,
    vipPercent: finiteNumber(vipItem?.percent),
    taxPercent: document.taxPercent,
    paidToman: document.paidToman,
    discountToman: finiteNumber(order.discountToman),
  });
  const collapsed =
    money.lines.length === 1 && money.lines[0]?.description === FALLBACK_LINE_DESCRIPTION;
  const totalsMatch =
    money.totalRial === document.totalRial &&
    money.taxRial === document.taxRial &&
    money.discountRial === document.discountRial;
  if (collapsed || !totalsMatch) return document;
  return { ...document, lines: money.lines };
};

export const readInvoiceByOrderId = async (
  orderId: number,
  executor: any = db,
): Promise<InvoiceDocument | null> => {
  const [row] = await executor
    .select()
    .from(invoice)
    .where(eq(invoice.orderId, orderId));
  if (!row) return null;

  const lines = await executor
    .select()
    .from(invoiceLine)
    .where(eq(invoiceLine.invoiceId, row.id))
    .orderBy(asc(invoiceLine.rowNumber));

  const document = toInvoiceDocument(row, lines);
  const detailed = await withPriceDetails(document, executor).catch(() => document);
  const devices = await devicesByToothNumber(orderId, executor);
  return {
    ...detailed,
    lines: detailed.lines.map((line) => ({
      ...line,
      description: mentionDevicesInDescription(line.description, devices),
    })),
  };
};
