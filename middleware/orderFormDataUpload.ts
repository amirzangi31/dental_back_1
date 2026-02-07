import multer from "multer";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/responses";
import fs from "fs";
import { db } from "../db";
import { files as filesTable } from "../db/schema/files";

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


export const processOrderFormData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const uploadMiddleware = upload.any();

  uploadMiddleware(req, res, async (err) => {
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

    try {
      let orderData: any = {};

      if (req.body && req.body.orderData) {
        orderData = typeof req.body.orderData === 'string' 
          ? JSON.parse(req.body.orderData) 
          : req.body.orderData;
      } else if (req.body && typeof req.body === 'object') {
        const bodyKeys = Object.keys(req.body);
        if (bodyKeys.length > 0) {
          const firstKey = bodyKeys[0];
          try {
            orderData = typeof req.body[firstKey] === 'string'
              ? JSON.parse(req.body[firstKey])
              : req.body[firstKey];
          } catch {
            orderData = req.body;
          }
        }
      }

      if (req.body.vip !== undefined && orderData.vip === undefined) {
        orderData.vip = req.body.vip === 'true' || req.body.vip === true || req.body.vip === '1' || req.body.vip === 1;
      }
      if (req.body.comment !== undefined && orderData.comment === undefined) {
        orderData.comment = req.body.comment || null;
      }
      if (req.body.connections !== undefined && (orderData.connections === undefined || !Array.isArray(orderData.connections))) {
        try {
          orderData.connections = typeof req.body.connections === 'string'
            ? JSON.parse(req.body.connections)
            : req.body.connections;
        } catch {
          orderData.connections = Array.isArray(req.body.connections) ? req.body.connections : [];
        }
      }
      if (req.body.antagonists !== undefined && (orderData.antagonists === undefined || !Array.isArray(orderData.antagonists))) {
        try {
          orderData.antagonists = typeof req.body.antagonists === 'string'
            ? JSON.parse(req.body.antagonists)
            : req.body.antagonists;
        } catch {
          orderData.antagonists = Array.isArray(req.body.antagonists) ? req.body.antagonists : [];
        }
      }

      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        const filesMap = new Map<string, Express.Multer.File>();
        const filesArray: Express.Multer.File[] = [];

        files.forEach((file) => {
          if (file.path) {
            file.path = file.path.replace(/\\/g, "/");
          }
          filesMap.set(file.fieldname, file);
          filesArray.push(file);
        });

        const rootFile = filesMap.get('file');
        if (rootFile) {
          // فایل اصلی سفارش همچنان به صورت مسیر ذخیره می‌شود
          orderData.file = rootFile.path;
        } else if (orderData.file === undefined || orderData.file === null ||
                   (typeof orderData.file === 'object' && orderData.file && Object.keys(orderData.file).length === 0)) {
          // اگر فایل جدید نیامده، مقدار فعلی را حفظ کن (برای createOrderWithRefrence)
          // فقط اگر واقعاً undefined یا object خالی بود null کن
          if (orderData.file === undefined || (typeof orderData.file === 'object' && orderData.file && Object.keys(orderData.file).length === 0)) {
            orderData.file = null;
          }
        }

        if (orderData.teeth && Array.isArray(orderData.teeth)) {
          let fileIndex = 0;
          const materialsFiles = filesArray.filter(f => f.fieldname !== 'file');

          // حلقه‌های همگام برای استفاده از await
          for (let toothIndex = 0; toothIndex < orderData.teeth.length; toothIndex++) {
            const tooth: any = orderData.teeth[toothIndex];

            if (tooth.materials && Array.isArray(tooth.materials)) {
              for (let materialIndex = 0; materialIndex < tooth.materials.length; materialIndex++) {
                const material: any = tooth.materials[materialIndex];

                const fieldName1 = `teeth[${toothIndex}].materials[${materialIndex}].file`;
                const fieldName2 = `teeth.${toothIndex}.materials.${materialIndex}.file`;
                const fieldName3 = `teeth[${toothIndex}][materials][${materialIndex}][file]`;

                let file = filesMap.get(fieldName1) || 
                          filesMap.get(fieldName2) || 
                          filesMap.get(fieldName3);

                if (!file && material.file !== null && material.file !== undefined) {
                  if (typeof material.file === 'object' && material.file && Object.keys(material.file).length === 0) {
                    if (fileIndex < materialsFiles.length) {
                      file = materialsFiles[fileIndex];
                      fileIndex++;
                    }
                  }
                }

                if (file) {
                  // ذخیره فایل متریال در جدول files و قرار دادن id در material.file
                  const user = (req as any).user;
                  const [fileRecord] = await db
                    .insert(filesTable)
                    .values({
                      filename: path.basename(file.path),
                      originalname: file.originalname,
                      mimetype: file.mimetype,
                      size: file.size,
                      path: file.path,
                      user_id: user?.userId || user?.id || null,
                    })
                    .returning();

                  material.file = fileRecord.id;
                } else if (material.file === undefined || 
                          (typeof material.file === 'object' && material.file && Object.keys(material.file).length === 0)) {
                  // فقط اگر undefined یا object خالی بود null کن
                  // اگر عدد (file id قبلی) بود، حفظش کن
                  material.file = null;
                }
                // اگر material.file یک عدد (file id) باشد، همان را حفظ می‌کنیم
              }
            }
          }
        }
      } else {
        if (orderData.file === undefined || 
            (typeof orderData.file === 'object' && orderData.file && Object.keys(orderData.file).length === 0)) {
          orderData.file = null;
        }
        
        if (orderData.teeth && Array.isArray(orderData.teeth)) {
          orderData.teeth.forEach((tooth: any) => {
            if (tooth.materials && Array.isArray(tooth.materials)) {
              tooth.materials.forEach((material: any) => {
                // اگر file یک object خالی است ({} که نشان می‌دهد فایل باید ارسال می‌شد)
                if (typeof material.file === 'object' && material.file && Object.keys(material.file).length === 0) {
                  material.file = null;
                } else if (material.file === undefined) {
                  material.file = null;
                }
                // اگر material.file یک عدد (file id) باشد، همان را حفظ می‌کنیم
              });
            }
          });
        }
      }

      req.body = orderData;
      
      next();
    } catch (parseError) {
      console.error("Error parsing order data:", parseError);
      return errorResponse(
        res,
        400,
        "خطا در پردازش داده‌های سفارش",
        parseError
      );
    }
  });
};

