import { Request, Response } from "express";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "../../../db";
import { independentServiceCategory } from "../../../db/schema/independentService";
import { errorResponse, successResponse } from "../../../utils/responses";
import { getPagination } from "../../../utils/pagination";
import { combineFilters, matchesText, searchText } from "../../../utils/listQuery";

const toRow = (row: typeof independentServiceCategory.$inferSelect) => ({
  id: row.id,
  title: row.title,
  active: row.active,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const listIndependentCategories = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const whereClause = combineFilters(
      eq(independentServiceCategory.isDeleted, 0),
      matchesText(searchText(req), [
        independentServiceCategory.id,
        independentServiceCategory.title,
      ]),
    );
    const orderByClause =
      sort === "desc"
        ? desc(independentServiceCategory.createdAt)
        : asc(independentServiceCategory.sortOrder);
    const [{ total }] = await db
      .select({ total: count() })
      .from(independentServiceCategory)
      .where(whereClause);
    const rows = await db
      .select()
      .from(independentServiceCategory)
      .where(whereClause)
      .orderBy(orderByClause, asc(independentServiceCategory.id))
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
      "INDEPENDENT_CATEGORY_LIST",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const independentCategoryDropdown = async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: independentServiceCategory.id,
        title: independentServiceCategory.title,
      })
      .from(independentServiceCategory)
      .where(
        and(
          eq(independentServiceCategory.isDeleted, 0),
          eq(independentServiceCategory.active, true),
        ),
      )
      .orderBy(asc(independentServiceCategory.sortOrder), asc(independentServiceCategory.id));
    return successResponse(res, 200, rows, "INDEPENDENT_CATEGORY_LIST");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createIndependentCategory = async (req: Request, res: Response) => {
  try {
    const [created] = await db
      .insert(independentServiceCategory)
      .values({
        title: String(req.body.title).trim(),
        active: req.body.active === undefined ? true : Boolean(req.body.active),
        sortOrder: Number(req.body.sortOrder ?? 0),
      })
      .returning();
    return successResponse(res, 201, toRow(created), "INDEPENDENT_CATEGORY_CREATED");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateIndependentCategory = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const patch: Partial<typeof independentServiceCategory.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (req.body.title !== undefined) patch.title = String(req.body.title).trim();
    if (req.body.active !== undefined) patch.active = Boolean(req.body.active);
    if (req.body.sortOrder !== undefined) patch.sortOrder = Number(req.body.sortOrder);
    const [updated] = await db
      .update(independentServiceCategory)
      .set(patch)
      .where(and(eq(independentServiceCategory.id, id), eq(independentServiceCategory.isDeleted, 0)))
      .returning();
    if (!updated) return errorResponse(res, 404, "INDEPENDENT_CATEGORY_NOT_FOUND", null);
    return successResponse(res, 200, toRow(updated), "INDEPENDENT_CATEGORY_UPDATED");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteIndependentCategory = async (req: Request, res: Response) => {
  try {
    const [deleted] = await db
      .update(independentServiceCategory)
      .set({ isDeleted: 1, active: false, updatedAt: new Date() })
      .where(
        and(
          eq(independentServiceCategory.id, Number(req.params.id)),
          eq(independentServiceCategory.isDeleted, 0),
        ),
      )
      .returning();
    if (!deleted) return errorResponse(res, 404, "INDEPENDENT_CATEGORY_NOT_FOUND", null);
    return successResponse(res, 200, {}, "INDEPENDENT_CATEGORY_DELETED");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
