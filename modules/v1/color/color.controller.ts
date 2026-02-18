import { Request, Response } from "express";
import { db } from "../../../db";
import { color } from "../../../db/schema/color";
import { errorResponse, successResponse } from "../../../utils/responses";
import { asc, count, desc, eq } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";

export const getColor = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(color.createdAt) : desc(color.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(color);
    const colorList = await db
      .select({
        id: color.id,
        title: color.title,
        code: color.code,
        category: color.category,
      })
      .from(color)
      .where(eq(color.isDeleted , 0))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: colorList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Colors fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};


export const getColorDropdown = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(color.createdAt) : desc(color.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(color);
    const colorList = await db
      .select({ id: color.id, title: color.title })
      .from(color)
      .orderBy(orderByClause)
   
    return successResponse(
      res,
      200,
      {
        items: colorList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Color dropdown fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createColor = async (req: Request, res: Response) => {
  try {
    const { title, code, category } = req.body;
    const createdColor = await db.insert(color).values({ title, code, category });
    return successResponse(res, 200, { title, code, category }, "Color created successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateColor = async (req: Request, res: Response) => {
  try {
    const { title, code, category } = req.body;
    const updatedColor = await db
      .update(color)
      .set({ title, code, category })
      .where(eq(color.id, Number(req.params.id)));
    return successResponse(res, 200, { title, code, category }, "Color updated successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteColor = async (req: Request, res: Response) => {
  try {
    const deletedColor = await db
      .update(color)
      .set({isDeleted : 1})
      .where(eq(color.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      deletedColor,
      "Color deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
/**
 * Color APIs for Postman:
 * 
 * GET    /api/v1/color/colors
 * POST   /api/v1/color/color
 * PUT    /api/v1/color/color/:id
 * DELETE /api/v1/color/color/:id
 * 
 * Note: Replace `:id` with the actual color id.
 * These endpoints are protected and require authentication.
 */
