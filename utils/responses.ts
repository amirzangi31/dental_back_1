import { Response } from "express";

export const successResponse = (res: Response, statusCode = 200, data: any, message: string) => {
  return res
    .status(statusCode)
    .json({ status: statusCode, success: true, data  , resultMessage : message });
};
  
export const errorResponse = (res: Response, statusCode: number, message: string, data: any) => {
  return res
    .status(statusCode)
    .json({ status: statusCode, success: false, error: message, data });
};

