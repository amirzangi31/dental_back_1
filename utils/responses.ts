import { Response } from "express";
import { getPrimaryMessage, ResponseMessage } from "./i18n";

export const successResponse = (
  res: Response,
  statusCode = 200,
  data: any,
  message: ResponseMessage,
) => {
  return res.status(statusCode).json({
    status: statusCode,
    success: true,
    data,
    resultMessage: getPrimaryMessage(message),
  });
};

export const errorResponse = (
  res: Response,
  statusCode: number,
  message: ResponseMessage,
  data: any,
) => {
  return res.status(statusCode).json({
    status: statusCode,
    success: false,
    error: getPrimaryMessage(message),
    data,
  });
};
