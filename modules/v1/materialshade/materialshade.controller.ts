import { Request, Response } from "express";
import { db } from "../../../db";
import { materialshade } from "../../../db/schema/materialshade";
import { errorResponse, successResponse } from "../../../utils/responses";
import { eq } from "drizzle-orm";
import { color } from "../../../db/schema/color";

export const getMaterialShade = async (req: Request, res: Response) => {
  try {
    const materialShadeList = await db
    .select({
      id: materialshade.id,
      title: materialshade.title,
      price: materialshade.price,
      category: materialshade.category,
      color: {
        id: color.id,
        code: color.code,
        title: color.title,
      },
    })
    .from(materialshade)
    .leftJoin(color, eq(materialshade.color, color.id));
    
    return successResponse(
      res,
      200,
      materialShadeList,
      "MaterialShade fetched successfully"
    );
  } catch (error) {
    console.log(error)
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createMaterialShade = async (req: Request, res: Response) => {
  try {
    const { title, price, category, color } = req.body;

    const materialShadeItem = await db
      .insert(materialshade)
      .values({
        title,
        price: price ? String(price) : null,
        category: category || null,
        color: color ? parseInt(color) : null,
      })
      .returning();

    return successResponse(
      res,
      200,
      materialShadeItem[0],
      "MaterialShade created successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateMaterialShade = async (req: Request, res: Response) => {
  try {
    const { title, price, category, color } = req.body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (price) updateData.price = String(price);
    if (category) updateData.category = category;
    if (color) updateData.color = parseInt(color);

    const materialShadeItem = await db
      .update(materialshade)
      .set(updateData)
      .where(eq(materialshade.id, Number(req.params.id)))
      .returning();

    return successResponse(
      res,
      200,
      materialShadeItem[0],
      "MaterialShade updated successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteMaterialShade = async (req: Request, res: Response) => {
  try {
    const materialShadeItem = await db
      .delete(materialshade)
      .where(eq(materialshade.id, Number(req.params.id)));
      
    return successResponse(
      res,
      200,
      materialShadeItem,
      "MaterialShade deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

