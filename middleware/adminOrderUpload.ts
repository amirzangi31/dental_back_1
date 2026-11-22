import multer from "multer";
import { Request } from "express";
import { errorResponse } from "../utils/responses";
import { Response, NextFunction } from "express";
import fs from "fs";
import { isAllowedUploadFile } from "./upload";
import { normalizeUploadedRequest, storedUploadFilename } from "../utils/uploadFilename";

// ایجاد پوشه order-files در صورت عدم وجود
const orderFilesDir = "order-files";
if (!fs.existsSync(orderFilesDir)) {
  fs.mkdirSync(orderFilesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, orderFilesDir + "/");
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    cb(null, storedUploadFilename(file.originalname));
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (isAllowedUploadFile(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("نوع فایل مجاز نیست"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export const uploadAdminOrderFile = (fieldName: string = "file") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadMiddleware = upload.single(fieldName);
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return errorResponse(
              res,
              400,
              "حجم فایل بیش از حد مجاز است (حداکثر 50MB)",
              null
            );
          }
          return errorResponse(res, 400, "خطا در آپلود فایل", err);
        }
        return errorResponse(res, 400, err.message || "خطا در آپلود فایل", err);
      }
      normalizeUploadedRequest(req);
      next();
    });
  };
};

