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
  deviceTitle: string | null;
  beforeTaxToman: number;
};

type InvoiceMoneyLine = {
  rowNumber: number;
  productCode: null;
  description: string;
  quantity: number;
  unitAmountRial: number;
  lineTotalRial: number;
  discountRial: number;
  amountAfterDiscountRial: number;
  taxRial: number;
  tollRial: 0;
  taxAndTollRial: number;
  totalWithTaxRial: number;
};

export type InvoiceBillMaterial = {
  id: number;
  title: string;
  price: number;
};

export type InvoiceBillTooth = {
  categoryId: number;
  categoryTitle: string | null;
  categoryPrice: number;
  toothNumber: number | null;
  patientName: string | null;
  deviceTitle: string | null;
  materials: InvoiceBillMaterial[];
};

export type InvoicePricePart = {
  description: string;
  quantity: number;
  beforeTaxToman: number;
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
  deviceTitle: string | null,
) =>
  pricePartDescription(
    categoryTitle,
    toothNumber === null || toothNumber === undefined ? [] : [toothNumber],
    patientName,
    deviceTitle,
  );

export const pricePartDescription = (
  title: string | null,
  toothNumbers: number[],
  patientName: string | null,
  deviceTitle: string | null,
) => {
  const parts: string[] = [];
  const name = blank(title);
  if (name) parts.push(name);
  if (toothNumbers.length === 1) parts.push(`دندان ${toothNumbers[0]}`);
  else if (toothNumbers.length > 1) parts.push(`دندان ${toothNumbers.join(" - ")}`);
  const deviceName = blank(deviceTitle);
  if (deviceName) parts.push(`دستگاه ${deviceName}`);
  const patient = blank(patientName);
  if (patient) parts.push(`بیمار ${patient}`);
  return parts.join("، ");
};

// Same split as the checkout bill: category price, then each material price.
// Identical teeth stay on one row and the quantity is their count.
export const invoicePriceParts = (teeth: InvoiceBillTooth[]): InvoicePricePart[] => {
  type Group = {
    title: string;
    deviceTitle: string | null;
    patientName: string | null;
    teeth: number[];
    categoryPrice: number;
    materials: InvoiceBillMaterial[];
  };
  const groups = new Map<string, Group>();

  teeth.forEach((tooth) => {
    const materials = tooth.materials.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
    }));
    const signature = materials
      .map((item) => `${item.id}:${item.price}`)
      .sort()
      .join(",");
    const key = [
      tooth.categoryId,
      tooth.categoryPrice,
      tooth.deviceTitle ?? "",
      tooth.patientName ?? "",
      signature,
    ].join("|");
    const existing = groups.get(key);
    if (existing) {
      if (tooth.toothNumber !== null && tooth.toothNumber !== undefined) {
        existing.teeth.push(tooth.toothNumber);
      }
      return;
    }
    groups.set(key, {
      title: blank(tooth.categoryTitle) ?? "",
      deviceTitle: tooth.deviceTitle,
      patientName: tooth.patientName,
      teeth:
        tooth.toothNumber !== null && tooth.toothNumber !== undefined
          ? [tooth.toothNumber]
          : [],
      categoryPrice: tooth.categoryPrice,
      materials,
    });
  });

  const parts: InvoicePricePart[] = [];
  groups.forEach((group) => {
    const toothNumbers = [...group.teeth].sort((a, b) => a - b);
    const count = Math.max(1, toothNumbers.length);
    const describe = (title: string) =>
      pricePartDescription(title, toothNumbers, group.patientName, group.deviceTitle);
    let categoryShown = false;
    if (group.categoryPrice || group.categoryPrice === 0) {
      categoryShown = true;
      parts.push({
        description: describe(group.title),
        quantity: count,
        beforeTaxToman: group.categoryPrice * count,
      });
    }
    group.materials.forEach((item) => {
      const ownTitle = blank(item.title) ?? "—";
      const title = categoryShown
        ? ownTitle
        : [group.title, ownTitle].filter(Boolean).join(" / ");
      parts.push({
        description: describe(title),
        quantity: count,
        beforeTaxToman: item.price * count,
      });
    });
  });
  return parts;
};

const insertDeviceMention = (description: string, deviceTitle: string) => {
  const phrase = `دستگاه ${deviceTitle}`;
  const patientMarker = "، بیمار ";
  const patientIndex = description.indexOf(patientMarker);
  if (patientIndex === -1) return `${description}، ${phrase}`;
  return `${description.slice(0, patientIndex)}، ${phrase}${description.slice(patientIndex)}`;
};

export const mentionDevicesInDescription = (
  description: string,
  devicesByTooth: ReadonlyMap<number, string>,
) => {
  if (!description || description.includes("دستگاه ")) return description;
  if (description === VIP_LINE_DESCRIPTION) return description;

  const toothMatch = description.match(/دندان\s+(\d+)/);
  if (toothMatch) {
    const deviceTitle = devicesByTooth.get(Number(toothMatch[1]));
    return deviceTitle ? insertDeviceMention(description, deviceTitle) : description;
  }

  if (description !== FALLBACK_LINE_DESCRIPTION) return description;
  const titles = [...new Set(devicesByTooth.values())].filter(Boolean);
  if (titles.length === 0) return description;
  return `${description}، ${titles.map((title) => `دستگاه ${title}`).join("، ")}`;
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
  quantity = 1,
): InvoiceMoneyLine => {
  const safeQuantity = quantity > 0 ? quantity : 1;
  const amountAfterDiscountRial = beforeTaxRial - discountRial;
  return {
    rowNumber,
    productCode: null,
    description,
    quantity: safeQuantity,
    unitAmountRial: Math.round(beforeTaxRial / safeQuantity),
    lineTotalRial: beforeTaxRial,
    discountRial,
    amountAfterDiscountRial,
    taxRial,
    tollRial: 0,
    taxAndTollRial: taxRial,
    totalWithTaxRial: amountAfterDiscountRial + taxRial,
  };
};

const draftLineRial = (beforeTaxToman: number, quantity: number) => {
  const safeQuantity = quantity > 0 ? quantity : 1;
  const unitRial = Math.round((beforeTaxToman / safeQuantity) * 10);
  return { quantity: safeQuantity, lineRial: unitRial * safeQuantity };
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
  parts?: InvoicePricePart[];
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
  const baseDrafts: InvoicePricePart[] =
    input.parts && input.parts.length > 0
      ? input.parts
      : input.teeth.map((tooth) => ({
          description: toothLineDescription(
            tooth.categoryTitle,
            tooth.toothNumber,
            tooth.patientName,
            tooth.deviceTitle,
          ),
          quantity: 1,
          beforeTaxToman: Number(tooth.beforeTaxToman) || 0,
        }));
  const teethSum = baseDrafts.reduce((sum, part) => sum + part.beforeTaxToman, 0);
  const vipToman = input.isVip ? (teethSum * vipPercent) / 100 : 0;
  const beforeTaxToman = teethSum + vipToman;
  const afterDiscountToman = beforeTaxToman - discountToman;
  const taxToman = (afterDiscountToman * taxPercent) / 100;
  const finalToman = afterDiscountToman + taxToman;
  const reconstructedMatches =
    baseDrafts.length > 0 &&
    discountToman <= beforeTaxToman &&
    Math.round(finalToman) === paidToman;

  if (!reconstructedMatches) {
    return collapsedMoney(paidToman, paidRial, taxPercent, discountRial);
  }

  const drafts: InvoicePricePart[] = [...baseDrafts];
  if (input.isVip) {
    drafts.push({
      description: VIP_LINE_DESCRIPTION,
      quantity: 1,
      beforeTaxToman: vipToman,
    });
  }

  const pricedDrafts = drafts.map((draft) => ({
    ...draft,
    ...draftLineRial(draft.beforeTaxToman, draft.quantity),
  }));
  const lineRials = pricedDrafts.map((draft) => draft.lineRial);
  const beforeTaxRial = lineRials.reduce((sum, amount) => sum + amount, 0);
  if (discountRial > beforeTaxRial) {
    return collapsedMoney(paidToman, paidRial, taxPercent, discountRial);
  }
  const discountShares = allocate(discountRial, lineRials);
  const afterDiscountRials = lineRials.map(
    (amount, index) => amount - discountShares[index],
  );
  const taxRial = paidRial - afterDiscountRials.reduce((sum, amount) => sum + amount, 0);
  if (taxRial < 0) {
    return collapsedMoney(paidToman, paidRial, taxPercent, discountRial);
  }

  const taxShares = allocate(taxRial, afterDiscountRials);
  const lines = pricedDrafts.map((draft, index) =>
    lineFromParts(
      index + 1,
      draft.description,
      draft.lineRial,
      discountShares[index],
      taxShares[index],
      draft.quantity,
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
