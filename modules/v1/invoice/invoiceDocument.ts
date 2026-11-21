import { invoice, invoiceLine } from "../../../db/schema/invoice";

export const INVOICE_COPY_LABELS = ["فروشنده", "خریدار", "حسابداری"] as const;
export const VIP_LINE_DESCRIPTION = "خدمات ویژه";
export const FALLBACK_LINE_DESCRIPTION = "خدمات لابراتوار";

export type InvoiceLineView = {
  rowNumber: number;
  productCode: string | null;
  description: string;
  quantity: number;
  unitAmountRial: number;
  lineTotalRial: number;
  discountRial: number;
  amountAfterDiscountRial: number;
  taxRial: number;
  tollRial: number;
  taxAndTollRial: number;
  totalWithTaxRial: number;
};

export type InvoiceParty = {
  name: string | null;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  economicNumber: string | null;
  nationalId: string | null;
  city: string | null;
  taxCode?: string | null;
};

export type InvoiceSeller = InvoiceParty & {
  registrationNumber: string | null;
};

export type InvoiceDocument = {
  id: number;
  orderId: number;
  paymentId: number;
  issuedAt: string;
  buyer: InvoiceParty;
  seller: InvoiceSeller;
  taxNumber: string | null;
  taxPercent: number;
  paidToman: number;
  totalRial: number;
  discountRial: number;
  discountCode: string | null;
  tollRial: number;
  taxRial: number;
  cashRial: number | null;
  nonCashRial: number | null;
  trackingCode: string | null;
  notes: string | null;
  lines: InvoiceLineView[];
  copies: typeof INVOICE_COPY_LABELS;
  stamp: null;
  signature: null;
};

export type InvoiceToothInput = {
  categoryTitle: string | null;
  toothNumber: number | null;
  patientName: string | null;
  beforeTaxToman: number;
};

type InvoiceMoneyLine = {
  rowNumber: number;
  productCode: null;
  description: string;
  quantity: 1;
  unitAmountRial: number;
  lineTotalRial: number;
  discountRial: number;
  amountAfterDiscountRial: number;
  taxRial: number;
  tollRial: 0;
  taxAndTollRial: number;
  totalWithTaxRial: number;
};

export type InvoiceMoney = {
  lines: InvoiceMoneyLine[];
  taxPercent: number;
  taxRial: number;
  totalRial: number;
  discountRial: number;
  tollRial: 0;
  paidToman: number;
};

export const blank = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const buyerDisplayName = (user: {
  name?: string | null;
  lastName?: string | null;
  laboratoryName?: string | null;
}) => {
  const laboratoryName = blank(user.laboratoryName);
  if (laboratoryName) return laboratoryName;
  return blank([user.name, user.lastName].filter(Boolean).join(" "));
};

export const toothLineDescription = (
  categoryTitle: string | null,
  toothNumber: number | null,
  patientName: string | null,
) => {
  const parts: string[] = [];
  const title = blank(categoryTitle);
  if (title) parts.push(title);
  if (toothNumber !== null && toothNumber !== undefined) {
    parts.push(`دندان ${toothNumber}`);
  }
  const patient = blank(patientName);
  if (patient) parts.push(`بیمار ${patient}`);
  return parts.join("، ");
};

export const invoiceNotes = (
  comment: string | null | undefined,
  trackingCode: string | null | undefined,
  discountCode?: string | null,
) => {
  const parts: string[] = [];
  const text = blank(comment);
  if (text) parts.push(text);
  const code = blank(trackingCode);
  if (code) parts.push(`کد پیگیری: ${code}`);
  const discount = blank(discountCode);
  if (discount) parts.push(`کد تخفیف: ${discount}`);
  return parts.join("\n");
};

const lineFromParts = (
  rowNumber: number,
  description: string,
  beforeTaxRial: number,
  discountRial: number,
  taxRial: number,
): InvoiceMoneyLine => {
  const amountAfterDiscountRial = beforeTaxRial - discountRial;
  return {
    rowNumber,
    productCode: null,
    description,
    quantity: 1,
    unitAmountRial: beforeTaxRial,
    lineTotalRial: beforeTaxRial,
    discountRial,
    amountAfterDiscountRial,
    taxRial,
    tollRial: 0,
    taxAndTollRial: taxRial,
    totalWithTaxRial: amountAfterDiscountRial + taxRial,
  };
};

const allocate = (total: number, weights: number[]): number[] => {
  if (weights.length === 0) return [];
  const safeWeights = weights.map((weight) => (weight > 0 ? weight : 0));
  const weightSum = safeWeights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) return safeWeights.map(() => 0);
  if (weightSum === 0) {
    return safeWeights.map((_, index) => (index === 0 ? total : 0));
  }

  const raw = safeWeights.map((weight) => (total * weight) / weightSum);
  const floors = raw.map((value) => Math.floor(value));
  let remainder = total - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const shares = [...floors];
  for (const item of order) {
    if (remainder <= 0) break;
    shares[item.index] += 1;
    remainder -= 1;
  }
  return shares;
};

const collapsedMoney = (
  paidToman: number,
  paidRial: number,
  taxPercent: number,
  discountRial = 0,
): InvoiceMoney => {
  const percentHundredths = Math.round(taxPercent * 100);
  const afterDiscountRial =
    percentHundredths <= 0
      ? paidRial
      : Math.round((paidRial * 10000) / (10000 + percentHundredths));
  const taxRial = paidRial - afterDiscountRial;
  const safeDiscountRial = Math.max(0, discountRial);
  const beforeTaxRial = afterDiscountRial + safeDiscountRial;
  return {
    lines: [
      lineFromParts(
        1,
        FALLBACK_LINE_DESCRIPTION,
        beforeTaxRial,
        safeDiscountRial,
        taxRial,
      ),
    ],
    taxPercent,
    taxRial,
    totalRial: paidRial,
    discountRial: safeDiscountRial,
    tollRial: 0,
    paidToman,
  };
};

// تخفیف از کد ثبت‌شده روی سفارش می‌آید و قبل از مالیات از مبلغ کم شده است.
// جمع فاکتور همچنان همان مبلغ پرداخت‌شده است.
export const buildInvoiceMoney = (input: {
  teeth: InvoiceToothInput[];
  isVip: boolean;
  vipPercent: number;
  taxPercent: number;
  paidToman: number;
  discountToman?: number;
}): InvoiceMoney => {
  const paidToman = Math.round(input.paidToman);
  const paidRial = paidToman * 10;
  const taxPercent = Number.isFinite(input.taxPercent) ? input.taxPercent : 0;
  const vipPercent = Number.isFinite(input.vipPercent) ? input.vipPercent : 0;
  const discountToman = Number.isFinite(input.discountToman)
    ? Math.max(0, Math.round(input.discountToman ?? 0))
    : 0;
  const discountRial = discountToman * 10;
  const teethSum = input.teeth.reduce((sum, tooth) => {
    const price = Number(tooth.beforeTaxToman);
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);
  const vipToman = input.isVip ? (teethSum * vipPercent) / 100 : 0;
  const beforeTaxToman = teethSum + vipToman;
  const afterDiscountToman = beforeTaxToman - discountToman;
  const taxToman = (afterDiscountToman * taxPercent) / 100;
  const finalToman = afterDiscountToman + taxToman;
  const reconstructedMatches =
    input.teeth.length > 0 &&
    discountToman <= beforeTaxToman &&
    Math.round(finalToman) === paidToman;

  if (!reconstructedMatches) {
    return collapsedMoney(paidToman, paidRial, taxPercent, discountRial);
  }

  const drafts: { description: string; beforeTaxToman: number }[] = input.teeth.map(
    (tooth) => ({
      description: toothLineDescription(
        tooth.categoryTitle,
        tooth.toothNumber,
        tooth.patientName,
      ),
      beforeTaxToman: Number(tooth.beforeTaxToman) || 0,
    }),
  );
  if (input.isVip) {
    drafts.push({
      description: VIP_LINE_DESCRIPTION,
      beforeTaxToman: vipToman,
    });
  }

  const unitRials = drafts.map((draft) => Math.round(draft.beforeTaxToman * 10));
  const beforeTaxRial = unitRials.reduce((sum, amount) => sum + amount, 0);
  if (discountRial > beforeTaxRial) {
    return collapsedMoney(paidToman, paidRial, taxPercent, discountRial);
  }
  const discountShares = allocate(discountRial, unitRials);
  const afterDiscountRials = unitRials.map(
    (amount, index) => amount - discountShares[index],
  );
  const taxRial = paidRial - afterDiscountRials.reduce((sum, amount) => sum + amount, 0);
  if (taxRial < 0) {
    return collapsedMoney(paidToman, paidRial, taxPercent, discountRial);
  }

  const taxShares = allocate(taxRial, afterDiscountRials);
  const lines = drafts.map((draft, index) =>
    lineFromParts(
      index + 1,
      draft.description,
      unitRials[index],
      discountShares[index],
      taxShares[index],
    ),
  );
  const totalRial = lines.reduce((sum, line) => sum + line.totalWithTaxRial, 0);
  if (totalRial !== paidRial) {
    return collapsedMoney(paidToman, paidRial, taxPercent, discountRial);
  }

  return {
    lines,
    taxPercent,
    taxRial: lines.reduce((sum, line) => sum + line.taxRial, 0),
    totalRial,
    discountRial: lines.reduce((sum, line) => sum + line.discountRial, 0),
    tollRial: 0,
    paidToman,
  };
};

type InvoiceRow = typeof invoice.$inferSelect;
type InvoiceLineRow = typeof invoiceLine.$inferSelect;

export const toInvoiceDocument = (
  row: InvoiceRow,
  lines: InvoiceLineRow[],
): InvoiceDocument => ({
  id: row.id,
  orderId: row.orderId,
  paymentId: row.paymentId,
  issuedAt: row.issuedAt.toISOString(),
  buyer: {
    name: row.buyerName,
    phone: row.buyerPhone,
    address: row.buyerAddress,
    postalCode: row.buyerPostalCode,
    economicNumber: row.buyerEconomicNumber,
    nationalId: row.buyerNationalId,
    city: row.buyerCity,
    taxCode: row.buyerTaxCode,
  },
  seller: {
    name: row.sellerName,
    phone: row.sellerPhone,
    address: row.sellerAddress,
    postalCode: row.sellerPostalCode,
    economicNumber: row.sellerEconomicNumber,
    nationalId: row.sellerNationalId,
    registrationNumber: row.sellerRegistrationNumber,
    city: row.sellerCity,
  },
  taxNumber: row.taxNumber,
  taxPercent: Number(row.taxPercent),
  paidToman: row.paidToman,
  totalRial: row.totalRial,
  discountRial: row.discountRial,
  discountCode: row.discountCode,
  tollRial: row.tollRial,
  taxRial: row.taxRial,
  cashRial: row.cash ? row.totalRial : null,
  nonCashRial: row.cash ? null : row.totalRial,
  trackingCode: row.trackingCode,
  notes: row.notes,
  lines: [...lines]
    .sort((a, b) => a.rowNumber - b.rowNumber)
    .map((line) => ({
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
  copies: INVOICE_COPY_LABELS,
  stamp: null,
  signature: null,
});
