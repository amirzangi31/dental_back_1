import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { errorResponse, successResponse } from "../../../utils/responses";
import { db } from "../../../db";
import { userRoles, users, type UserRole } from "../../../db/schema/users";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";
import { userIdentityPatch } from "../../../utils/userIdentityPatch";
import { combineFilters, matchesText, readQuery, searchText } from "../../../utils/listQuery";

export const getUser = async (req: Request, res: Response) => {
  try {
    const token = (req as any).token;

    let email;
    try {
      const decoded: any = verify(token, process.env.SECRET_KEY as string);
      email = decoded.email;
    } catch (err) {
      return errorResponse(res, 401, "توکن نامعتبر است", null);
    }

    const user = await db
      .select({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        specaility: users.specaility,
        laboratoryName: users.laboratoryName,
        phoneNumber: users.phoneNumber,
        country: users.country,
        postalCode: users.postalCode,
        nationalCode: users.nationalCode,
        province: users.province,
        taxCode: users.taxCode,
        economicCode: users.economicCode,
        address: users.address,
      })
      .from(users)
      .where(eq(users.email, email));
    if (user.length > 0) {
      return successResponse(res, 200, user[0], "user fetched successfully");
    }
    return errorResponse(res, 404, "user not found", null);
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const token = (req as any).token;
    let email;
    try {
      const decoded: any = verify(token, process.env.SECRET_KEY as string);
      email = decoded.email;
    } catch (err) {
      return errorResponse(res, 401, "توکن نامعتبر است", null);
    }

    const {
      name,
      lastName,
      specaility,
      laboratoryName,
      phoneNumber,
      country,
      postalCode,
    } = req.body;

    await db
      .update(users)
      .set({
        name,
        lastName,
        specaility,
        laboratoryName,
        phoneNumber,
        country,
        postalCode,
        ...userIdentityPatch(req.body),
      })
      .where(eq(users.email, email));
    return successResponse(res, 200, {}, "user updated successfully");
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const getUsersList = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const role = readQuery(req, "role");
    if (role && !userRoles.includes(role as UserRole)) {
      return errorResponse(res, 400, "Invalid user role", null);
    }
    const whereClause = combineFilters(
      or(eq(users.role, "doctor"), eq(users.role, "labrator"), eq(users.isDeleted, 0)),
      role ? eq(users.role, role as UserRole) : undefined,
      matchesText(searchText(req), [
        users.id,
        users.name,
        users.lastName,
        users.email,
        users.specaility,
        users.laboratoryName,
        users.phoneNumber,
        users.nationalCode,
        users.economicCode,
      ]),
    );
    const orderByClause =
      sort === "asc" ? asc(users.createdAt) : desc(users.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(users).where(whereClause);
    const usersList = await db
      .select({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
        specaility: users.specaility,
        laboratoryName: users.laboratoryName,
        role: users.role,
        phoneNumber: users.phoneNumber,
        nationalCode: users.nationalCode,
        province: users.province,
        taxCode: users.taxCode,
        economicCode: users.economicCode,
        address: users.address,
      })
      .from(users)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: usersList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "users list fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        specaility: users.specaility,
        laboratoryName: users.laboratoryName,
        phoneNumber: users.phoneNumber,
        country: users.country,
        postalCode: users.postalCode,
        nationalCode: users.nationalCode,
        province: users.province,
        taxCode: users.taxCode,
        economicCode: users.economicCode,
        address: users.address,
      })
      .from(users)
      .where((eq(users.id, Number(id))));
     
    return successResponse(res, 200, user[0], "user fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const editUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      lastName,
      specaility,
      laboratoryName,
      phoneNumber,
      country,
      postalCode,
    } = req.body;

    const updatedUser = await db
      .update(users)
      .set({
        name,
        lastName,
        specaility,
        laboratoryName,
        phoneNumber,
        country,
        postalCode,
        ...userIdentityPatch(req.body),
      })
      .where(eq(users.id, Number(id)));

    return successResponse(res, 200, updatedUser, "User updated successfully");
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const getUsersPicker = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const q = searchText(req);
    const role = String(req.query.role || "").trim();

    if (role && !userRoles.includes(role as UserRole)) {
      return errorResponse(res, 400, "Invalid user role", null);
    }

    const filters = [eq(users.isDeleted, 1)];
    if (role) {
      filters.push(eq(users.role, role as UserRole));
    }
    if (q) {
      const pattern = `%${q}%`;
      const search = or(
        ilike(users.name, pattern),
        ilike(users.lastName, pattern),
        ilike(users.email, pattern),
        ilike(users.laboratoryName, pattern),
        ilike(users.phoneNumber, pattern),
      );
      if (search) filters.push(search);
    }

    const whereClause = and(...filters);
    const orderByClause = sort === "asc" ? asc(users.createdAt) : desc(users.createdAt);

    const [{ total }] = await db.select({ total: count() }).from(users).where(whereClause);
    const items = await db
      .select({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        laboratoryName: users.laboratoryName,
      })
      .from(users)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return successResponse(
      res,
      200,
      {
        items,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "users list fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.update(users).set({isDeleted : 1}).where(eq(users.id, Number(id)));
    return successResponse(res, 200, {}, "User deleted successfully");
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};
