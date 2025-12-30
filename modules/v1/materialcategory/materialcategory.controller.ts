import { Request, Response } from "express";
import { db } from "../../../db";
import { materialcategory } from "../../../db/schema/materialcategory";
import { eq, and, asc, desc, count } from "drizzle-orm";
import { successResponse } from "../../../utils/responses";
import { getPagination } from "../../../utils/pagination";

export const createMaterialCategory = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    const inserted = await db
      .insert(materialcategory)
      .values({ title })
      .returning();

    res.status(201).json({
      success: true,
      data: inserted[0],
      message: "Material category created successfully",
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: err });
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
      "Material categories fetched successfully"
    );
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: err });
  }
};

export const getMaterialCategoryDropDown = async (
  req: Request,
  res: Response
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
      "Material categories fetched successfully"
    );
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: err });
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
          eq(materialcategory.isDeleted, 0)
        )
      );

    if (!category.length) {
      return res
        .status(404)
        .json({ success: false, message: "Material category not found" });
    }

    res.status(200).json({
      success: true,
      data: category[0],
      message: "Material category fetched successfully",
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: err });
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
          eq(materialcategory.isDeleted, 0)
        )
      )
      .returning();

    if (!updated.length) {
      return res.status(404).json({
        success: false,
        message: "Material category not found or already deleted",
      });
    }

    res.status(200).json({
      success: true,
      data: updated[0],
      message: "Material category updated successfully",
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: err });
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
      return res
        .status(404)
        .json({ success: false, message: "Material category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Material category deleted successfully",
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: err });
  }
};
