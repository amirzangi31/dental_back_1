import { Request, Response } from "express";
import { db } from "../../../db";
import { material } from "../../../db/schema/material";
import { errorResponse, successResponse } from "../../../utils/responses";
import { and, asc, count, desc, eq, isNull, or } from "drizzle-orm";
import { files } from "../../../db/schema/files";
import { getPagination } from "../../../utils/pagination";
import { color } from "../../../db/schema/color";
import { materialcategory } from "../../../db/schema/materialcategory";

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
      color: color && color !== "null" && color !== "" && color !== "0"
        ? parseInt(color)
        : null,
      descriptionStatus: descriptionStatus ? descriptionStatus : "none",
      materialcategory: materialcategory && materialcategory !== "null" && materialcategory !== "" && materialcategory !== "0"
        ? parseInt(materialcategory)
        : null,
      file: file.path,
      category: category && category !== "null" && category !== "" && category !== "0"
        ? parseInt(category)
        : null,
      parent_id: parent_id && parent_id !== "null" && parent_id !== "" && parent_id !== "0"
        ? parseInt(parent_id)
        : null,
    };
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


export const getMaterialByCategory = async (req: Request, res: Response) => {
  try {
    const { category, sort } = req.params;
    const orderByClause =
      sort === "asc" ? asc(material.createdAt) : desc(material.createdAt);
    const categoryNumber = parseInt(category);
    
    if (isNaN(categoryNumber)) {
      return errorResponse(res, 400, "Invalid category ID", null);
    }
    
    const rows = await db
      .select({
        id: material.id,
        title: material.title,
        price: material.price,
        file: material.file,
        parent_id: material.parent_id,
        color: color.code,  
        category: material.category,
        description: material.description,
        descriptionStatus: material.descriptionStatus,
        materialcategoryId: material.materialcategory,
        materialcategoryTitle: materialcategory.title,
      })
      .from(material)
      .leftJoin(color, eq(material.color, color.id))
      .leftJoin(materialcategory, eq(material.materialcategory, materialcategory.id))
      .where(and(eq(material.category, categoryNumber), eq(material.isDeleted, 0)))
      .orderBy(orderByClause);
    
    // Create a map to store materials with their children
    const materialMap = new Map<number, any>();
    const materialCategoryMap = new Map<number | null, { materialcategory: { id: number | null; title: string | null } | null; materials: any[] }>();
    
    // First pass: create material objects with children array and group by materialcategory
    for (const row of rows) {
      const materialCategoryId = row.materialcategoryId || null;
      const materialCategoryTitle = row.materialcategoryTitle || null;
      
      // Remove materialcategory fields from material object
      const { materialcategoryId: _, materialcategoryTitle: __, ...materialData } = row;
      
      // Create material object with children array
      const materialObj = {
        ...materialData,
        children: [],
      };
      
      materialMap.set(row.id, materialObj);
      
      // Group by materialcategory
      if (!materialCategoryMap.has(materialCategoryId)) {
        materialCategoryMap.set(materialCategoryId, {
          materialcategory: materialCategoryId ? { id: materialCategoryId, title: materialCategoryTitle } : null,
          materials: [],
        });
      }
    }
    
    // Second pass: build tree structure and add to materialcategory groups
    for (const row of rows) {
      const materialObj = materialMap.get(row.id)!;
      const materialCategoryId = row.materialcategoryId || null;
      
      if (row.parent_id === null) {
        // Root material - add to materialcategory group
        materialCategoryMap.get(materialCategoryId)!.materials.push(materialObj);
      } else {
        // Child material - add to parent's children
        const parent = materialMap.get(row.parent_id);
        if (parent) {
          parent.children.push(materialObj);
        } else {
          // If parent not found in current category, add as root
          materialCategoryMap.get(materialCategoryId)!.materials.push(materialObj);
        }
      }
    }
    
    // Convert map to array format
    const groupedMaterials = Array.from(materialCategoryMap.values());
  
    return successResponse(
      res,
      200,
      groupedMaterials,
      "Materials fetched successfully"
    );
  } catch (error) {
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
      color: req.body.color && req.body.color !== "null" && req.body.color !== "" && req.body.color !== "0"
        ? parseInt(req.body.color)
        : null,
      descriptionStatus: req.body.descriptionStatus
        ? req.body.descriptionStatus
        : "none",
      materialcategory: req.body.materialcategory && req.body.materialcategory !== "null" && req.body.materialcategory !== "" && req.body.materialcategory !== "0"
        ? parseInt(req.body.materialcategory)
        : null,
      file: file.path,
      category: req.body.category && req.body.category !== "null" && req.body.category !== "" && req.body.category !== "0"
        ? parseInt(req.body.category)
        : null,
      parent_id: req.body.parent_id && req.body.parent_id !== "null" && req.body.parent_id !== "" && req.body.parent_id !== "0"
        ? parseInt(req.body.parent_id)
        : null,
    };

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
    console.log(error)
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
