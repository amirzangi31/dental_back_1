import { Request, Response } from "express";
import { db } from "../../../db";
import { category } from "../../../db/schema/category";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { asc, count, desc, eq } from "drizzle-orm";
import { catalog } from "../../../db/schema/catalog";
import { color } from "../../../db/schema/color";
import { getPagination } from "../../../utils/pagination";

export const getCategory = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(category.createdAt) : desc(category.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(category);
    const categoryList = await db
      .select({
        id: category.id,
        title: category.title,
        description: category.description,
        file: category.file,
        price: category.price,
        color: {
          id: color.id,
          color: color.code,
        },
        catalog: {
          id: catalog.id,
          title: catalog.title,
        },
      })
      .from(category)
      .where(eq(category.isDeleted, 0))
      .leftJoin(catalog, eq(category.catalog, catalog.id))
      .leftJoin(color, eq(category.color, color.id))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: categoryList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Category fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getCategoryDropDown = async (req: Request, res: Response) => {
  try {
    const categoryList = await db
      .select({
        id: category.id,
        title: category.title,
      })
      .from(category)
      .where(eq(category.isDeleted , 0))
      .orderBy(asc(category.title));

    return successResponse(
      res,
      200,
      categoryList,
      "Category fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { title, description, price, catalog, color } = req.body;
    const file = req.file;

    if (!file) {
      return errorResponse(res, 400, "فایل الزامی است", null);
    }

    const fileRecord = await db
      .insert(files)
      .values({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        user_id: (req as any).user?.id || null,
      })
      .returning();

    const categoryItem = await db
      .insert(category)
      .values({
        title,
        description,
        price: price ? String(price) : null,
        catalog: catalog ? parseInt(catalog) : null,
        file: file.path,
        color: color ? parseInt(color) : null,
      })
      .returning();

    return successResponse(
      res,
      200,
      { category: categoryItem },
      "Category created successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { title, description, price, catalog, color } = req.body;
    const file = req.file;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price) updateData.price = String(price);
    if (catalog) updateData.catalog = parseInt(catalog);
    if (color) updateData.color = parseInt(color);
    if (file) {
      await db.insert(files).values({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        user_id: (req as any).user?.id || null,
      });
      updateData.file = file.path;
    }
    const categoryItem = await db
      .update(category)
      .set(updateData)
      .where(eq(category.id, Number(req.params.id)))
      .returning();

    return successResponse(
      res,
      200,

      { categoryItem },
      "Category updated successfully",
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const categoryItem = await db
      .update(category)
      .set({ isDeleted: 0 })
      .where(eq(category.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      categoryItem,
      "Category deleted successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
