import multer from "multer";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/responses";
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

/**
 * Middleware برای پردازش FormData در ایجاد سفارش
 * این middleware:
 * 1. فایل‌ها را از FormData دریافت و ذخیره می‌کند
 * 2. JSON string را parse می‌کند
 * 3. فایل‌ها را به ساختار JSON اضافه می‌کند
 * 
 * انتظار می‌رود که:
 * - یک فیلد 'orderData' حاوی JSON string از داده‌های سفارش
 * - فایل‌ها با نام‌های 'teeth[toothIndex].materials[materialIndex].file' ارسال شوند
 */
export const processOrderFormData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // استفاده از any() برای دریافت تمام فیلدها
  const uploadMiddleware = upload.any();
  
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

    try {
      // Parse کردن JSON string از orderData
      let orderData: any = {};
      
      if (req.body.orderData) {
        orderData = typeof req.body.orderData === 'string' 
          ? JSON.parse(req.body.orderData) 
          : req.body.orderData;
      } else {
        // اگر orderData وجود نداشت، سعی می‌کنیم تمام body را parse کنیم
        // این برای حالتی است که کل داده به صورت JSON string ارسال شده
        const bodyKeys = Object.keys(req.body);
        if (bodyKeys.length > 0) {
          const firstKey = bodyKeys[0];
          try {
            orderData = typeof req.body[firstKey] === 'string'
              ? JSON.parse(req.body[firstKey])
              : req.body[firstKey];
          } catch {
            // اگر parse نشد، از req.body استفاده می‌کنیم
            orderData = req.body;
          }
        }
      }

      // اضافه کردن فیلدهای جداگانه از FormData (vip, comment, connections)
      // این فیلدها ممکن است به صورت جداگانه در FormData ارسال شوند
      // اگر در JSON string موجود باشند، اولویت با آن است
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

      // پردازش فایل‌ها و اضافه کردن به ساختار
      const files = req.files as Express.Multer.File[];
      
      if (files && files.length > 0) {
        // ایجاد یک map برای نگهداری فایل‌ها بر اساس fieldname
        const filesMap = new Map<string, Express.Multer.File>();
        const filesArray: Express.Multer.File[] = [];
        
        files.forEach((file) => {
          // فیکس کردن مسیر
          if (file.path) {
            file.path = file.path.replace(/\\/g, "/");
          }
          filesMap.set(file.fieldname, file);
          filesArray.push(file);
        });

        // پردازش فایل root level (file)
        const rootFile = filesMap.get('file');
        if (rootFile) {
          orderData.file = rootFile.path;
        } else if (orderData.file === undefined || 
                   (typeof orderData.file === 'object' && Object.keys(orderData.file).length === 0)) {
          orderData.file = null;
        }

        // اضافه کردن فایل‌ها به ساختار orderData (materials files)
        if (orderData.teeth && Array.isArray(orderData.teeth)) {
          let fileIndex = 0;
          // فیلتر کردن فایل‌هایی که root file نیستند (برای materials)
          const materialsFiles = filesArray.filter(f => f.fieldname !== 'file');
          
          orderData.teeth.forEach((tooth: any, toothIndex: number) => {
            if (tooth.materials && Array.isArray(tooth.materials)) {
              tooth.materials.forEach((material: any, materialIndex: number) => {
                // روش 1: جستجو با نام دقیق field
                const fieldName1 = `teeth[${toothIndex}].materials[${materialIndex}].file`;
                const fieldName2 = `teeth.${toothIndex}.materials.${materialIndex}.file`;
                const fieldName3 = `teeth[${toothIndex}][materials][${materialIndex}][file]`;
                
                let file = filesMap.get(fieldName1) || 
                          filesMap.get(fieldName2) || 
                          filesMap.get(fieldName3);
                
                // روش 2: اگر فایل با نام دقیق پیدا نشد، از index استفاده می‌کنیم
                // این برای حالتی است که فایل‌ها به ترتیب ارسال می‌شوند
                if (!file && material.file !== null && material.file !== undefined) {
                  // اگر material.file یک object است (مثل {} که نشان می‌دهد فایل باید ارسال شود)
                  if (typeof material.file === 'object' && Object.keys(material.file).length === 0) {
                    if (fileIndex < materialsFiles.length) {
                      file = materialsFiles[fileIndex];
                      fileIndex++;
                    }
                  }
                }
                
                if (file) {
                  // ذخیره مسیر فایل در material
                  material.file = file.path;
                } else if (material.file === null || material.file === undefined || 
                          (typeof material.file === 'object' && Object.keys(material.file).length === 0)) {
                  // اگر فایلی وجود نداشت یا یک object خالی بود، null بگذار
                  material.file = null;
                }
                // اگر material.file قبلاً یک string (مسیر) یا مقدار دیگری بود، آن را نگه می‌داریم
              });
            }
          });
        }
      } else {
        // اگر فایلی ارسال نشد، تمام file fields را null می‌کنیم
        if (orderData.file === undefined || 
            (typeof orderData.file === 'object' && Object.keys(orderData.file).length === 0)) {
          orderData.file = null;
        }
        
        if (orderData.teeth && Array.isArray(orderData.teeth)) {
          orderData.teeth.forEach((tooth: any) => {
            if (tooth.materials && Array.isArray(tooth.materials)) {
              tooth.materials.forEach((material: any) => {
                // اگر file یک object خالی است ({} که نشان می‌دهد فایل باید ارسال می‌شد)
                if (typeof material.file === 'object' && Object.keys(material.file).length === 0) {
                  material.file = null;
                } else if (material.file === undefined) {
                  material.file = null;
                }
              });
            }
          });
        }
      }

      // جایگزین کردن req.body با داده‌های پردازش شده
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

