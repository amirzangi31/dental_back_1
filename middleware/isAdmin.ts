import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/responses";
import { verify } from "jsonwebtoken";

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = (req as any).token;
    const decoded: any = verify(token, process.env.SECRET_KEY as string);
    if (!decoded || decoded.role !== "admin") {
      return errorResponse(
        res,
        403,
        "You do not have permission to perform this action.",
        null
      );
    }
    next();
  } catch (err) {
    return errorResponse(res, 500, "An error has occurred.", null);
  }
};
