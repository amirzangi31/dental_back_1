import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../../../utils/responses";

export const parseIndependentServiceBody = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body?.options === "string") {
    try {
      req.body.options = req.body.options.trim() ? JSON.parse(req.body.options) : [];
    } catch {
      return errorResponse(res, 400, "INDEPENDENT_SERVICE_INVALID", null);
    }
  }
  next();
};
