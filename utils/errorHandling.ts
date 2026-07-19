import { Response, NextFunction } from "express";
import { errorResponse } from "./responses";

export const errorHandling = (
  error: any,
  res: Response,
  next: NextFunction
) => {
  if (error.code === 11000) {
    return errorResponse(res, 400, "USER_ALREADY_EXISTS", null);
  }
  if (error.name === "ValidationError") {
    return errorResponse(res, 400, error.message, null);
  }
  return next(error);
};
