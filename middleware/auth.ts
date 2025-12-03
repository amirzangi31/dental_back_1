import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/responses";
import { decode, verify } from "jsonwebtoken";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers["authorization"];
    if (!authorization) {
      return errorResponse(res, 401, "Please log in again", null);
    }
    const token = authorization.split(" ")[1];
    if (!token) {
      return errorResponse(res, 401, "Please log in again", null);
    }
    let payload;
    try {
      const secretKey = process.env.SECRET_KEY || "";
      payload = verify(token, secretKey);
    } catch (err) {
      return errorResponse(
        res,
        401,
        "Please log in again. Token is expired",
        null
      );
    }
    const user = decode(token) as any;
    if (!user) {
      return errorResponse(res, 401, "Please log in again", null);
    }
    (req as any).user = user;
    (req as any).token = token;
    next();
  } catch (err) {
    console.log(err);
    return errorResponse(res, 401, "Please log in again", null);
  }
};
