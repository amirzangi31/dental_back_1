import { Response, NextFunction } from "express";
import { errorResponse } from "./responses";

export const errorHandling = (
  error: any,
  res: Response,
  next: NextFunction
) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return errorResponse(
      res,
      400,
      `کاربری قبلا با این مشخصات ثبت نام شده است`,
      null
    );
  }
  if (error.name === "ValidationError") {
    return errorResponse(res, 400, error.message, null);
  }
  return next(error);
};
