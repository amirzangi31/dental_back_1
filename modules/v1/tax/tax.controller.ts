import { Request, Response } from "express";
import { db } from "../../../db";
import { tax } from "../../../db/schema/tax";
import { errorResponse, successResponse } from "../../../utils/responses";
import { desc, asc, eq, count } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";

export const getTax = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause = sort === "asc" ? asc(tax.createdAt) : desc(tax.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(tax);
    const taxList = await db
      .select({
        id: tax.id,
        percent: tax.percent,
        title: tax.title,
      })
      .from(tax)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: taxList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Taxes fetched successfully"
    );
  } catch (error) {
    console.log(error)
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getTaxById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const taxItem = await db
      .select({
        id: tax.id,
        percent: tax.percent,
        title: tax.title,
      })
      .from(tax)
      .where(eq(tax.id, Number(id)))
      .limit(1);

    if (taxItem.length === 0) {
      return errorResponse(res, 404, "Tax not found", null);
    }

    return successResponse(res, 200, taxItem[0], "Tax fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createTax = async (req: Request, res: Response) => {
  try {
    const { title, percent } = req.body;
    const taxItem = await db
      .insert(tax)
      .values({ title, percent })
      .returning();
    return successResponse(res, 201, taxItem, "Tax created successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateTax = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, percent } = req.body;


    const [updatedTax] = await db
      .update(tax)
      .set({ title, percent })
      .where(eq(tax.id, Number(id)))
      .returning();

    if (!updatedTax) {
      return errorResponse(res, 404, "Tax not found", null);
    }

    return successResponse(res, 200, updatedTax, "Tax updated successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteTax = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedTax = await db
      .delete(tax)
      .where(eq(tax.id, Number(id)))
      .returning();

   

    return successResponse(res, 200, {}, "Tax deleted successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
