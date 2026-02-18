import { Request, Response } from "express";
import { db } from "../../../db";
import { catalog } from "../../../db/schema/catalog";
import { errorResponse, successResponse } from "../../../utils/responses";
import { asc, count, desc, eq } from "drizzle-orm";
import { category } from "../../../db/schema/category";
import { color } from "../../../db/schema/color";
import { getPagination } from "../../../utils/pagination";

export const getCatalog = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(catalog.createdAt) : desc(catalog.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(catalog);
    const rows = await db
      .select({
        id: catalog.id,
        title: catalog.title,
      })
      .from(catalog)
      .where(eq(catalog.isDeleted, 0))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return successResponse(
      res,
      200,
      {
        items: rows,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Catalog fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const catalogDropDown = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(catalog.createdAt) : desc(catalog.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(catalog);
    const rows = await db
      .select({ id: catalog.id, title: catalog.title })
      .from(catalog)
      .orderBy(orderByClause);
    return successResponse(
      res,
      200,
      {
        items: rows,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Catalog fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getCatalogWithCategory = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const catalogOrderBy =
      sort === "asc" ? asc(catalog.createdAt) : desc(catalog.createdAt);
    const categoryOrderBy =
      sort === "asc" ? asc(category.createdAt) : desc(category.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(catalog);
    const rows = await db
      .select({
        id: catalog.id,
        title: catalog.title,
        category_id: category.id,
        category_title: category.title,
        category_price: category.price,
        category_file: category.file,
        category_description: category.description,
        category_color: {
          id: color.id,
          color: color.code,
        },
      })
      .from(catalog)
      .leftJoin(category, eq(catalog.id, category.catalog))
      .leftJoin(color, eq(category.color, color.id))
      .where(eq(catalog.isDeleted, 0))
      .orderBy(catalogOrderBy, categoryOrderBy)
      .limit(limit)
      .offset(offset);
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
          description: row.category_description,
        });
      }
    }
    const catalogList = Object.values(catalogMap);
    return successResponse(
      res,
      200,
      {
        items: catalogList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Catalog fetched successfully",
    );
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
      .update(catalog)
      .set({ isDeleted: 1 })
      .where(eq(catalog.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      catalogItem,
      "Catalog deleted successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
