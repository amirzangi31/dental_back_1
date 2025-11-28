import { Request, Response } from "express";
import { db } from "../../../db";
import { catalog } from "../../../db/schema/catalog";
import { errorResponse, successResponse } from "../../../utils/responses";
import { eq } from "drizzle-orm";
import { category } from "../../../db/schema/category";
import { color } from "../../../db/schema/color";

export const getCatalog = async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: catalog.id,
        title: catalog.title,
      })
      .from(catalog);

    return successResponse(res, 200, rows, "Catalog fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getCatalogWithCategory = async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: catalog.id,
        title: catalog.title,
        category_id: category.id,
        category_title: category.title,
        category_price: category.price,
        category_file: category.file,
        category_color: color.code,
      })
      .from(catalog)
      .leftJoin(category, eq(catalog.id, category.catalog))
      .leftJoin(color, eq(category.color, color.id));
    const catalogMap: Record<string, any> = {};
    for (const row of rows) {
      if (!row.id) continue;
      if (!catalogMap[row.id]) {
        catalogMap[row.id] = {
          id: row.id,
          title: row.title,
          children: [],
        };
      }
      if (row.category_id && row.category_title) {
        catalogMap[row.id].children.push({
          id: row.category_id,
          title: row.category_title,
          price: row.category_price,
          file: row.category_file,
          color: row.category_color,
        });
      }
    }
    const catalogList = Object.values(catalogMap);
    return successResponse(res, 200, catalogList, "Catalog fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createCatalog = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const catalogItem = await db.insert(catalog).values({ title });
    return successResponse(res, 200, { title }, "Catalog created successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateCatalog = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const catalogItem = await db
      .update(catalog)
      .set({ title })
      .where(eq(catalog.id, Number(req.params.id)));
    return successResponse(res, 200, { title }, "Catalog updated successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteCatalog = async (req: Request, res: Response) => {
  try {
    const catalogItem = await db
      .delete(catalog)
      .where(eq(catalog.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      catalogItem,
      "Catalog deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
