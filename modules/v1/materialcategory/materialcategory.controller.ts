import { Request, Response } from "express";
import { db } from "../../../db";
import { materialcategory } from "../../../db/schema/materialcategory";
import { eq, and, asc, desc, count } from "drizzle-orm";
import { errorResponse, successResponse } from "../../../utils/responses";
import { getPagination } from "../../../utils/pagination";

export const createMaterialCategory = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title) {
      return errorResponse(res, 400, "TITLE_REQUIRED", null);
    }

    const inserted = await db
      .insert(materialcategory)
      .values({ title })
      .returning();

    return successResponse(
      res,
      201,
      inserted[0],
      "MATERIAL_CATEGORY_CREATED",
    );
  } catch (err) {
    return errorResponse(res, 500, "INTERNAL_SERVER_ERROR", err);
  }
};

export const getMaterialCategories = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc"
        ? asc(materialcategory.createdAt)
        : desc(materialcategory.createdAt);
    const [{ total }] = await db
      .select({ total: count() })
      .from(materialcategory);
    const categories = await db
      .select()
      .from(materialcategory)
      .where(eq(materialcategory.isDeleted, 0))
      .orderBy(orderByClause);

    return successResponse(
      res,
      200,
      {
        items: categories,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "MATERIAL_CATEGORIES_FETCHED",
    );
  } catch (err) {
    return errorResponse(res, 500, "INTERNAL_SERVER_ERROR", err);
  }
};

export const getMaterialCategoryDropDown = async (
  req: Request,
  res: Response,
) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc"
        ? asc(materialcategory.createdAt)
        : desc(materialcategory.createdAt);
    const [{ total }] = await db
      .select({ total: count() })
      .from(materialcategory);
    const categories = await db
      .select()
      .from(materialcategory)
      .where(eq(materialcategory.isDeleted, 0))
      .orderBy(orderByClause);

    return successResponse(
      res,
      200,
      {
        items: categories,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "MATERIAL_CATEGORIES_FETCHED",
    );
  } catch (err) {
    console.log(err);
    return errorResponse(res, 500, "INTERNAL_SERVER_ERROR", err);
  }
};

export const getMaterialCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await db
      .select()
      .from(materialcategory)
      .where(
        and(
          eq(materialcategory.id, Number(id)),
          eq(materialcategory.isDeleted, 0),
        ),
      );

    if (!category.length) {
      return errorResponse(res, 404, "MATERIAL_CATEGORY_NOT_FOUND", null);
    }

    return successResponse(
      res,
      200,
      category[0],
      "MATERIAL_CATEGORY_FETCHED",
    );
  } catch (err) {
    return errorResponse(res, 500, "INTERNAL_SERVER_ERROR", err);
  }
};

export const updateMaterialCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const updated = await db
      .update(materialcategory)
      .set({ title })
      .where(
        and(
          eq(materialcategory.id, Number(id)),
          eq(materialcategory.isDeleted, 0),
        ),
      )
      .returning();

    if (!updated.length) {
      return errorResponse(
        res,
        404,
        "MATERIAL_CATEGORY_NOT_FOUND_OR_DELETED",
        null,
      );
    }

    return successResponse(
      res,
      200,
      updated[0],
      "MATERIAL_CATEGORY_UPDATED",
    );
  } catch (err) {
    return errorResponse(res, 500, "INTERNAL_SERVER_ERROR", err);
  }
};

export const deleteMaterialCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await db
      .update(materialcategory)
      .set({ isDeleted: 1 })
      .where(eq(materialcategory.id, Number(id)))
      .returning();

    if (!deleted.length) {
      return errorResponse(res, 404, "MATERIAL_CATEGORY_NOT_FOUND", null);
    }

    return successResponse(res, 200, null, "MATERIAL_CATEGORY_DELETED");
  } catch (err) {
    return errorResponse(res, 500, "INTERNAL_SERVER_ERROR", err);
  }
};
