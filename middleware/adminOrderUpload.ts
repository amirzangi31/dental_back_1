import multer from "multer";
import path from "path";
import { Request } from "express";
import { errorResponse } from "../utils/responses";
import { Response, NextFunction } from "express";
import fs from "fs";

// ایجاد پوشه order-files در صورت عدم وجود
const orderFilesDir = "order-files";
if (!fs.existsSync(orderFilesDir)) {
  fs.mkdirSync(orderFilesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, orderFilesDir + "/");
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (allowedMimes.includes(file.mimetype)) {
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
      if (req.file && req.file.path) {
        req.file.path = req.file.path.replace(/\\/g, "/");
      }
      next();
    });
  };
};

