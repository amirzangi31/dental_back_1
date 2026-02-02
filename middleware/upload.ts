import multer from "multer";
import path from "path";
import { Request } from "express";
import { errorResponse } from "../utils/responses";
import { Response, NextFunction } from "express";

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, "uploads/");
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
    "application/x-zip-compressed",
    "application/octet-stream"
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
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const uploadSingle = (fieldName: string = "file") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadMiddleware = upload.single(fieldName);
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return errorResponse(
              res,
              400,
              "حجم فایل بیش از حد مجاز است (حداکثر 10MB)",
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

export const uploadMultipleWithPathFix = (
  fieldName: string = "files",
  maxCount: number = 10
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return errorResponse(
              res,
              400,
              "حجم فایل بیش از حد مجاز است (حداکثر 10MB)",
              null
            );
          }
          if (err.code === "LIMIT_FILE_COUNT") {
            return errorResponse(
              res,
              400,
              `تعداد فایل‌ها بیش از حد مجاز است (حداکثر ${maxCount})`,
              null
            );
          }
          return errorResponse(res, 400, "خطا در آپلود فایل", err);
        }
        return errorResponse(res, 400, err.message || "خطا در آپلود فایل", err);
      }

      if (Array.isArray(req.files)) {
        req.files.forEach((file: any) => {
          if (file.path) {
            file.path = file.path.replace(/\\/g, "/");
          }
        });
      }

      next();
    });
  };
};

// اضافه کردن تبدیل بک‌اسلش به اسلش به سایر فانکشن‌ها

// Middleware برای آپلود یک فایل با فیکس کردن مسیر
export const uploadSingleWithPathFix = (fieldName: string = "file") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadMiddleware = upload.single(fieldName);
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return errorResponse(
              res,
              400,
              "حجم فایل بیش از حد مجاز است (حداکثر 10MB)",
              null
            );
          }
          return errorResponse(res, 400, "خطا در آپلود فایل", err);
        }
        return errorResponse(res, 400, err.message || "خطا در آپلود فایل", err);
      }
      // فیکس کردن مسیر
      if (req.file && req.file.path) {
        req.file.path = req.file.path.replace(/\\/g, "/");
      }
      next();
    });
  };
};

// Middleware برای آپلود چند فایل با نام‌های مختلف + فیکس کردن مسیرها
export const uploadFieldsWithPathFix = (
  fields: Array<{ name: string; maxCount?: number }>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadMiddleware = upload.fields(fields);
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return errorResponse(
              res,
              400,
              "حجم فایل بیش از حد مجاز است (حداکثر 10MB)",
              null
            );
          }
          return errorResponse(res, 400, "خطا در آپلود فایل", err);
        }
        return errorResponse(res, 400, err.message || "خطا در آپلود فایل", err);
      }
      // فیکس کردن مسیر تمام فایل‌ها
      if (req.files && typeof req.files === "object") {
        Object.values(req.files).forEach((arr: any) => {
          if (Array.isArray(arr)) {
            arr.forEach((file: any) => {
              if (file.path) {
                file.path = file.path.replace(/\\/g, "/");
              }
            });
          }
        });
      }
      next();
    });
  };
};
export const uploadMultiple = (
  fieldName: string = "files",
  maxCount: number = 10
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return errorResponse(
              res,
              400,
              "حجم فایل بیش از حد مجاز است (حداکثر 10MB)",
              null
            );
          }
          if (err.code === "LIMIT_FILE_COUNT") {
            return errorResponse(
              res,
              400,
              `تعداد فایل‌ها بیش از حد مجاز است (حداکثر ${maxCount})`,
              null
            );
          }
          return errorResponse(res, 400, "خطا در آپلود فایل", err);
        }
        return errorResponse(res, 400, err.message || "خطا در آپلود فایل", err);
      }
      next();
    });
  };
};

// Middleware برای آپلود چند فایل با نام‌های مختلف
export const uploadFields = (
  fields: Array<{ name: string; maxCount?: number }>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadMiddleware = upload.fields(fields);
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return errorResponse(
              res,
              400,
              "حجم فایل بیش از حد مجاز است (حداکثر 10MB)",
              null
            );
          }
          return errorResponse(res, 400, "خطا در آپلود فایل", err);
        }
        return errorResponse(res, 400, err.message || "خطا در آپلود فایل", err);
      }
      next();
    });
  };
};

// Export multer instance برای استفاده مستقیم
export { upload };
