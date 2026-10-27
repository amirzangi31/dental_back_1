import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../../utils/responses";
import { readSellerProfile, saveSellerProfile } from "./sellerProfile";

export const getSellerProfile = async (_req: Request, res: Response) => {
  try {
    const profile = await readSellerProfile();
    return successResponse(res, 200, profile, "Seller profile fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const putSellerProfile = async (req: Request, res: Response) => {
  try {
    const profile = await saveSellerProfile(req.body ?? {});
    return successResponse(res, 200, profile, "Seller profile saved successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
