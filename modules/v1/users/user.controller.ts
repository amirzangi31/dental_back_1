import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { errorResponse, successResponse } from "../../../utils/responses";
import { db } from "../../../db";
import { users } from "../../../db/schema/users";
import { and, asc, count, desc, eq, or } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";

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
    const orderByClause =
      sort === "asc" ? asc(users.createdAt) : desc(users.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(users);
    const usersList = await db
      .select({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
        specaility: users.specaility,
        laboratoryName: users.laboratoryName,
        role: users.role,
      })
      .from(users)
      .orderBy(orderByClause)
      .where(or(eq(users.role, "doctor") , eq(users.role, "labrator") , eq(users.isDeleted , 0)))
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
      })
      .where(eq(users.id, Number(id)));

    return successResponse(res, 200, updatedUser, "User updated successfully");
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
