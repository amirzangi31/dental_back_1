import { asc, eq, inArray } from "drizzle-orm";
import { invoice, invoiceLine } from "../../../db/schema/invoice";
import { orders, orderTeeth } from "../../../db/schema/orders";
import { users } from "../../../db/schema/users";
import { tooth } from "../../../db/schema/tooth";
import { category } from "../../../db/schema/category";
import { material } from "../../../db/schema/material";
import { tax } from "../../../db/schema/tax";
import { vip } from "../../../db/schema/vip";
import {
  buildInvoiceMoney,
  buyerDisplayName,
  invoiceNotes,
  InvoiceDocument,
  toInvoiceDocument,
} from "./invoiceDocument";
import { readInvoiceByOrderId } from "./readInvoice";

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

export const issueInvoiceForSettlement = async (
  tx: any,
  input: {
    orderId: number;
    paymentId: number;
    paidToman: number;
    trackingCode: string | null;
  },
): Promise<InvoiceDocument | null> => {
  const existing = await readInvoiceByOrderId(input.orderId, tx);
  if (existing) return existing;

  const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId));
  if (!order) return null;

  const [buyer] = await tx.select().from(users).where(eq(users.id, order.user_id));
  const [taxItem] = await tx.select().from(tax);
  const [vipItem] = await tx.select().from(vip);

  const teeth = await tx
    .select({
      id: tooth.id,
      toothnumber: tooth.toothnumber,
      categoryTitle: category.title,
      categoryPrice: category.price,
      materials: tooth.materials,
    })
    .from(orderTeeth)
    .innerJoin(tooth, eq(orderTeeth.toothId, tooth.id))
    .leftJoin(category, eq(tooth.category, category.id))
    .where(eq(orderTeeth.orderId, input.orderId))
    .orderBy(asc(tooth.id));

  const materialIds = [
    ...new Set(teeth.flatMap((row: { materials: { material?: number | null }[] }) =>
      materialIdsOf(row.materials),
    )),
  ];
  const materialRows = materialIds.length
    ? await tx
        .select({ id: material.id, price: material.price })
        .from(material)
        .where(inArray(material.id, materialIds))
    : [];
  const priceByMaterial = new Map<number, number>(
    materialRows.map((row: { id: number; price: string | null }) => [
      row.id,
      finiteNumber(row.price),
    ]),
  );

  const money = buildInvoiceMoney({
    teeth: teeth.map((row: {
      toothnumber: number | null;
      categoryTitle: string | null;
      categoryPrice: string | null;
      materials: { material?: number | null }[] | null;
    }) => ({
      categoryTitle: row.categoryTitle,
      toothNumber: row.toothnumber,
      patientName: order.patientname,
      beforeTaxToman:
        finiteNumber(row.categoryPrice) +
        materialIdsOf(row.materials).reduce(
          (sum, id) => sum + (priceByMaterial.get(id) ?? 0),
          0,
        ),
    })),
    isVip: order.vip === true,
    vipPercent: finiteNumber(vipItem?.percent),
    taxPercent: finiteNumber(taxItem?.percent),
    paidToman: input.paidToman,
  });

  const notes = invoiceNotes(order.comment, input.trackingCode);
  const issuedAt = new Date();
  const [created] = await tx
    .insert(invoice)
    .values({
      orderId: input.orderId,
      paymentId: input.paymentId,
      issuedAt,
      buyerName: buyer ? buyerDisplayName(buyer) : null,
      buyerPhone: buyer ? blank(buyer.phoneNumber) : null,
      buyerAddress: buyer ? blank(buyer.address) : null,
      buyerPostalCode: buyer ? blank(buyer.postalCode) : null,
      buyerEconomicNumber: null,
      buyerNationalId: null,
      buyerCity: null,
      sellerName: null,
      sellerEconomicNumber: null,
      sellerNationalId: null,
      sellerRegistrationNumber: null,
      sellerPostalCode: null,
      sellerCity: null,
      sellerAddress: null,
      sellerPhone: null,
      taxNumber: null,
      taxPercent: money.taxPercent.toFixed(2),
      paidToman: money.paidToman,
      totalRial: money.totalRial,
      discountRial: money.discountRial,
      tollRial: money.tollRial,
      taxRial: money.taxRial,
      cash: true,
      trackingCode: blank(input.trackingCode),
      notes: notes || null,
    })
    .returning();

  const createdLines = money.lines.length
    ? await tx
        .insert(invoiceLine)
        .values(
          money.lines.map((line) => ({
            invoiceId: created.id,
            rowNumber: line.rowNumber,
            productCode: line.productCode,
            description: line.description,
            quantity: line.quantity,
            unitAmountRial: line.unitAmountRial,
            lineTotalRial: line.lineTotalRial,
            discountRial: line.discountRial,
            amountAfterDiscountRial: line.amountAfterDiscountRial,
            taxRial: line.taxRial,
            tollRial: line.tollRial,
            taxAndTollRial: line.taxAndTollRial,
            totalWithTaxRial: line.totalWithTaxRial,
          })),
        )
        .returning()
    : [];

  return toInvoiceDocument(created, createdLines);
};

const blank = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
