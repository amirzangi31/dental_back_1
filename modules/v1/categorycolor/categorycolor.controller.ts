import { Request, Response } from "express";
import { db } from "../../../db";
import { categorycolor } from "../../../db/schema/categorycolor";
import { errorResponse, successResponse } from "../../../utils/responses";
import { asc, count, desc, eq } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";

export const getCategoryColor = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(categorycolor.createdAt) : desc(categorycolor.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(categorycolor);
    const categoryColorList = await db
      .select({
        id: categorycolor.id,
        title: categorycolor.title,
      })
      .from(categorycolor)
      .where(eq(categorycolor.isDeleted , 0))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: categoryColorList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Category colors fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createCategoryColor = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const createdCategoryColor = await db.insert(categorycolor).values({ title });
    return successResponse(res, 200, { title }, "Category color created successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateCategoryColor = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const updatedCategoryColor = await db
      .update(categorycolor)
      .set({ title })
      .where(eq(categorycolor.id, Number(req.params.id)));
    return successResponse(res, 200, { title }, "Category color updated successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteCategoryColor = async (req: Request, res: Response) => {
  try {
    const deletedCategoryColor = await db
      .update(categorycolor)
      .set({isDeleted : 1})
      .where(eq(categorycolor.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      deletedCategoryColor,
      "Category color deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
/**
 * CategoryColor APIs for Postman:
 * 
 * GET    /api/v1/categorycatalog/categorycolors
 * POST   /api/v1/categorycatalog/categorycolor
 * PUT    /api/v1/categorycatalog/categorycolor/:id
 * DELETE /api/v1/categorycatalog/categorycolor/:id
 * 
 * Note: Replace `:id` with the actual category color id.
 * These endpoints are protected and require authentication.
 */
