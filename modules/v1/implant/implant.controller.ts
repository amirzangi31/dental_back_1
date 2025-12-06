import { Request, Response } from "express";
import { db } from "../../../db";
import { implant } from "../../../db/schema/implant";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { eq } from "drizzle-orm";
import path from "path";
import { catalog } from "../../../db/schema/catalog";
import { color } from "../../../db/schema/color";

export const getImplant = async (req: Request, res: Response) => {
  try {
    const { typeList = "1" } = req.query; // 1 = list with children, 2 = list without children
    const rows = await db
      .select({
        id: implant.id,
        title: implant.title,
        price: implant.price,
        file: implant.file,
        parent_id: implant.parent_id,
        color: color.code,
      })
      .from(implant)
      .leftJoin(color, eq(implant.color, color.id));
    const map = new Map();

    for (const row of rows) {
      map.set(row.id, { ...row, children: [] });
    }

    const tree = [];

    for (const row of rows) {
      if (row.parent_id === null) {
        tree.push(map.get(row.id));
      } else {
        map.get(row.parent_id)?.children.push(map.get(row.id));
      }
    }

    return successResponse(
      res,
      200,
      typeList === "1" ? tree : rows,
      "Implant fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getImplantDropdown = async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: implant.id,
        title: implant.title,
      })
      .from(implant);
    return successResponse(
      res,
      200,
      rows,
      "Implant dropdown fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createImplant = async (req: Request, res: Response) => {
  try {
    const { title, description, price, color, parent_id } = req.body;
    const file = req.file;

    if (!file) {
      return errorResponse(res, 400, "File is required", null);
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

    const values: any = {
      title,
      description,
      price: price ? String(price) : null,
      color: color ? parseInt(color) : null,
      file: file.path,
    };

    if (
      parent_id !== "0"
    ) {
     
      values.parent_id = parseInt(parent_id);
    }else {
      values.parent_id = null;
    }

    const implantItem = await db.insert(implant).values(values).returning();

    return successResponse(
      res,
      200,
      { implant: implantItem },
      "Implant created successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateImplant = async (req: Request, res: Response) => {
  try {
    const { title, description, price, catalog } = req.body;
    const file = req.file;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price) updateData.price = String(price);
    if (catalog) updateData.catalog = parseInt(catalog);

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
    const implantItem = await db
      .update(implant)
      .set(updateData)
      .where(eq(implant.id, Number(req.params.id)))
      .returning();

    return successResponse(
      res,
      200,
      { implantItem },
      "Implant updated successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteImplant = async (req: Request, res: Response) => {
  try {
    const implantItem = await db
      .delete(implant)
      .where(eq(implant.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      implantItem,
      "Implant deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
