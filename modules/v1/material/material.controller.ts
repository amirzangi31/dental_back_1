import { Request, Response } from "express";
import { db } from "../../../db";
import { material } from "../../../db/schema/material";
import { errorResponse, successResponse } from "../../../utils/responses";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { files } from "../../../db/schema/files";
import { getPagination } from "../../../utils/pagination";

// Create Material
export const createMaterial = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      price,
      color,
      parent_id,
      category,
      descriptionStatus,
      materialcategory,
    } = req.body;
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
      descriptionStatus: descriptionStatus ? descriptionStatus : "none",
      materialcategory: materialcategory ? parseInt(materialcategory) : null,
      file: file.path,
      category: category ? parseInt(category) : null,
    };

    if (parent_id !== "0") {
      values.parent_id = parseInt(parent_id);
    } else {
      values.parent_id = null;
    }
    const materialItem = await db.insert(material).values(values).returning();

    return successResponse(
      res,
      200,
      { material: materialItem },
      "Material created successfully"
    );
  } catch (error: any) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

// Get All Materials
export const getMaterials = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(material.createdAt) : desc(material.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(material);
    const materials = await db
      .select()
      .from(material)
      .where(eq(material.isDeleted, 0))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: materials,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Materials fetched successfully"
    );
  } catch (error: any) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getMaterialDropDown = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(material.createdAt) : desc(material.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(material); 
        
    const materials = await db
      .select(
        {   
          id: material.id,
          title: material.title,
        }
      )
      .from(material)
      .where(eq(material.isDeleted, 0))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: materials,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Materials fetched successfully"
    );
  } catch (error: any) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

// Get Material by ID
export const getMaterialById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return errorResponse(res, 400, "Invalid material ID", null);
    }
    
    const result = await db
      .select()
      .from(material)
      .where(and(eq(material.id, id), eq(material.isDeleted, 0)));
    if (result.length === 0) {
      return errorResponse(res, 404, "Material not found", null);
    }
    return successResponse(
      res,
      200,
      result[0],
      "Material fetched successfully"
    );
  } catch (error: any) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

// Update Material
export const updateMaterial = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return errorResponse(res, 400, "Invalid material ID", null);
    }
    
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
      title: req.body.title,
      description: req.body.description,
      price: req.body.price ? String(req.body.price) : null,
      color: req.body.color ? parseInt(req.body.color) : null,
      descriptionStatus: req.body.descriptionStatus
        ? req.body.descriptionStatus
        : "none",
      materialcategory: req.body.materialcategory
        ? parseInt(req.body.materialcategory)
        : null,
      file: file.path,
      category: req.body.category ? parseInt(req.body.category) : null,
    };

    if (req.body.parent_id !== "0") {
      values.parent_id = parseInt(req.body.parent_id);
    } else {
      values.parent_id = null;
    }

    const materialItem = await db
      .update(material)
      .set(values)
      .where(and(eq(material.id, id), eq(material.isDeleted, 0)))
      .returning();
    
    if (materialItem.length === 0) {
      return errorResponse(res, 404, "Material not found", null);
    }
    
    return successResponse(
      res,
      200,
      { material: materialItem },
      "Material updated successfully"
    );
  } catch (error: any) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

// Delete Material (Soft Delete)
export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return errorResponse(res, 400, "Invalid material ID", null);
    }
    
    const deleted = await db
      .update(material)
      .set({ isDeleted: 1 })
      .where(and(eq(material.id, id), eq(material.isDeleted, 0)))
      .returning();
    if (deleted.length === 0) {
      return errorResponse(res, 404, "Material not found", null);
    }
    return successResponse(res, 200, null, "Material deleted successfully");
  } catch (error: any) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
