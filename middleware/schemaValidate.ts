import { Request, Response, NextFunction } from "express";
import { Schema } from "yup";
import { errorResponse } from "../utils/responses";

export const validate =
  (schema: Schema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate(req.body, { abortEarly: false }); // Validate the request body
      next(); // Proceed to the next middleware or route
    } catch (error: any) {
      console.log(error);
      return errorResponse(res, 400, "Validation Error", error.message); // Return validation errors
    }
  };
``