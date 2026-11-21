import { eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import {
  discountCode,
  DiscountKind,
} from "../../../db/schema/discountCode";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

// Same floor as the Zarinpal request. A code may not push a payable order under it.
export const MIN_PAYABLE_TOMAN = 1000;

export type DiscountCodeInput =
  | { state: "absent" }
  | { state: "empty" }
  | { state: "invalid" }
  | { state: "code"; code: string };

export type BillAfterDiscount = {
  discountToman: number;
  taxAmount: number;
  total: number;
};

const digitToEnglish = (char: string) => {
  const persian = PERSIAN_DIGITS.indexOf(char);
  if (persian >= 0) return String(persian);
  const arabic = ARABIC_DIGITS.indexOf(char);
  if (arabic >= 0) return String(arabic);
  return char;
};

export const normalizeDiscountCode = (value: string) =>
  [...value.trim()].map(digitToEnglish).join("").replace(/\s+/g, "").toUpperCase();

const isWellFormedCode = (code: string) => /^[\p{L}\p{N}-]{2,64}$/u.test(code);

export const readDiscountCodeInput = (value: unknown): DiscountCodeInput => {
  if (value === undefined || value === null) return { state: "absent" };
  if (typeof value !== "string") return { state: "invalid" };
  if (!value.trim()) return { state: "empty" };
  const code = normalizeDiscountCode(value);
  if (!isWellFormedCode(code)) return { state: "invalid" };
  return { state: "code", code };
};

export const discountTomanFor = (
  beforeTaxToman: number,
  kind: DiscountKind,
  value: number,
) => {
  const base = Number.isFinite(beforeTaxToman) ? Math.max(0, beforeTaxToman) : 0;
  const amount = kind === "percent" ? (base * value) / 100 : value;
  const capped = Math.min(base, Math.max(0, amount));
  return Math.floor(capped);
};

export const billAfterDiscount = (input: {
  beforeTaxToman: number;
  taxPercent: number;
  discountToman: number;
}): BillAfterDiscount => {
  const beforeTax = Number.isFinite(input.beforeTaxToman)
    ? Math.max(0, input.beforeTaxToman)
    : 0;
  const requested = Number.isFinite(input.discountToman)
    ? Math.max(0, Math.floor(input.discountToman))
    : 0;
  const discountToman = Math.min(beforeTax, requested);
  const afterDiscount = beforeTax - discountToman;
  const taxPercent = Number.isFinite(input.taxPercent) ? input.taxPercent : 0;
  const taxAmount = (afterDiscount * taxPercent) / 100;
  return {
    discountToman,
    taxAmount,
    total: afterDiscount + taxAmount,
  };
};

const rejection = (message: string) => ({ ok: false as const, message });

export const applyDiscountToBeforeTax = async (
  rawCode: unknown,
  beforeTaxToman: number,
  taxPercent: number,
  executor: any = db,
): Promise<({ ok: true; code: string | null } & BillAfterDiscount) | { ok: false; message: string }> => {
  const input = readDiscountCodeInput(rawCode);
  if (input.state === "invalid") return rejection("کد تخفیف معتبر نیست");
  if (input.state === "absent" || input.state === "empty") {
    return {
      ok: true,
      code: null,
      ...billAfterDiscount({ beforeTaxToman, taxPercent, discountToman: 0 }),
    };
  }

  const [row] = await executor
    .select()
    .from(discountCode)
    .where(eq(discountCode.code, input.code))
    .limit(1);

  if (!row || row.active !== true) return rejection("کد تخفیف معتبر نیست");

  const now = new Date();
  if (row.startsAt && row.startsAt > now) {
    return rejection("کد تخفیف هنوز فعال نشده است");
  }
  if (row.expiresAt && row.expiresAt < now) {
    return rejection("کد تخفیف منقضی شده است");
  }
  if (row.maxUses !== null && row.maxUses !== undefined && row.usedCount >= row.maxUses) {
    return rejection("ظرفیت استفاده از کد تخفیف تمام شده است");
  }

  const priced = billAfterDiscount({
    beforeTaxToman,
    taxPercent,
    discountToman: discountTomanFor(beforeTaxToman, row.kind, row.value),
  });
  const undiscounted = billAfterDiscount({
    beforeTaxToman,
    taxPercent,
    discountToman: 0,
  });
  if (undiscounted.total >= MIN_PAYABLE_TOMAN && priced.total < MIN_PAYABLE_TOMAN) {
    return rejection("مبلغ بعد از تخفیف باید حداقل ۱۰۰۰ تومان باشد");
  }

  return { ok: true, code: row.code, ...priced };
};

export const consumeDiscountUse = async (
  executor: any,
  code: string | null | undefined,
) => {
  const normalized = typeof code === "string" ? normalizeDiscountCode(code) : "";
  if (!isWellFormedCode(normalized)) return;
  await executor
    .update(discountCode)
    .set({
      usedCount: sql`${discountCode.usedCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(discountCode.code, normalized));
};
