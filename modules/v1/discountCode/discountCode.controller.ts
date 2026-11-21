import { Request, Response } from "express";
import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "../../../db";
import { discountCode, DiscountKind } from "../../../db/schema/discountCode";
import { errorResponse, successResponse } from "../../../utils/responses";
import { getPagination } from "../../../utils/pagination";
import { matchesText, searchText } from "../../../utils/listQuery";
import {
  applyDiscountToBeforeTax,
  normalizeDiscountCode,
  readDiscountCodeInput,
} from "./resolveDiscount";

const blank = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === "23505";

const toRow = (row: typeof discountCode.$inferSelect) => ({
  id: row.id,
  code: row.code,
  title: row.title,
  kind: row.kind,
  value: row.value,
  active: row.active,
  startsAt: row.startsAt,
  expiresAt: row.expiresAt,
  maxUses: row.maxUses,
  usedCount: row.usedCount,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const readPayload = (body: any) => {
  const input = readDiscountCodeInput(body.code);
  if (input.state !== "code") {
    return { ok: false as const, message: "کد تخفیف معتبر نیست" };
  }
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (startsAt && expiresAt && expiresAt < startsAt) {
    return {
      ok: false as const,
      message: "تاریخ پایان کد تخفیف باید بعد از تاریخ شروع باشد",
    };
  }
  return {
    ok: true as const,
    values: {
      code: normalizeDiscountCode(input.code),
      title: blank(body.title),
      kind: body.kind as DiscountKind,
      value: Number(body.value),
      active: body.active === undefined ? true : Boolean(body.active),
      startsAt,
      expiresAt,
      maxUses:
        body.maxUses === undefined || body.maxUses === null
          ? null
          : Number(body.maxUses),
      updatedAt: new Date(),
    },
  };
};

export const listDiscountCodes = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(discountCode.createdAt) : desc(discountCode.createdAt);
    const whereClause = matchesText(searchText(req), [
      discountCode.id,
      discountCode.code,
      discountCode.title,
    ]);
    const [{ total }] = await db
      .select({ total: count() })
      .from(discountCode)
      .where(whereClause);
    const rows = await db
      .select()
      .from(discountCode)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: rows.map(toRow),
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "کدهای تخفیف با موفقیت دریافت شد",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getDiscountCode = async (req: Request, res: Response) => {
  try {
    const [row] = await db
      .select()
      .from(discountCode)
      .where(eq(discountCode.id, Number(req.params.id)))
      .limit(1);
    if (!row) return errorResponse(res, 404, "کد تخفیف یافت نشد", null);
    return successResponse(res, 200, toRow(row), "کد تخفیف با موفقیت دریافت شد");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createDiscountCode = async (req: Request, res: Response) => {
  try {
    const payload = readPayload(req.body);
    if (!payload.ok) return errorResponse(res, 400, payload.message, null);
    const [created] = await db
      .insert(discountCode)
      .values(payload.values)
      .returning();
    return successResponse(res, 201, toRow(created), "کد تخفیف با موفقیت ساخته شد");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return errorResponse(res, 400, "این کد تخفیف قبلاً ثبت شده است", null);
    }
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateDiscountCode = async (req: Request, res: Response) => {
  try {
    const payload = readPayload(req.body);
    if (!payload.ok) return errorResponse(res, 400, payload.message, null);
    const [updated] = await db
      .update(discountCode)
      .set(payload.values)
      .where(eq(discountCode.id, Number(req.params.id)))
      .returning();
    if (!updated) return errorResponse(res, 404, "کد تخفیف یافت نشد", null);
    return successResponse(res, 200, toRow(updated), "کد تخفیف با موفقیت ویرایش شد");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return errorResponse(res, 400, "این کد تخفیف قبلاً ثبت شده است", null);
    }
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteDiscountCode = async (req: Request, res: Response) => {
  try {
    const [deleted] = await db
      .delete(discountCode)
      .where(eq(discountCode.id, Number(req.params.id)))
      .returning();
    if (!deleted) return errorResponse(res, 404, "کد تخفیف یافت نشد", null);
    return successResponse(res, 200, {}, "کد تخفیف با موفقیت حذف شد");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const checkDiscountCode = async (req: Request, res: Response) => {
  try {
    const beforeTaxToman = Number(req.body.beforeTaxToman);
    const applied = await applyDiscountToBeforeTax(
      req.body.code,
      beforeTaxToman,
      0,
    );
    if (!applied.ok) return errorResponse(res, 400, applied.message, null);
    if (!applied.code) return errorResponse(res, 400, "کد تخفیف معتبر نیست", null);
    return successResponse(
      res,
      200,
      {
        code: applied.code,
        beforeTaxToman,
        discountToman: applied.discountToman,
        total: applied.total,
      },
      "کد تخفیف معتبر است",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
