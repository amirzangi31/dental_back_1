import path from "path";
import type { Request } from "express";

/** Busboy reads multipart filenames as latin1. Browsers send UTF-8. */
export function decodeUploadName(name: string): string {
  const base =
    path
      .basename((name || "file").replace(/\\/g, "/"))
      .replace(/[\u0000-\u001f]/g, "")
      .trim() || "file";
  if (!/[\u0080-\u00ff]/.test(base)) return base;
  const decoded = Buffer.from(base, "latin1").toString("utf8").replace(/[\u0000-\u001f]/g, "").trim();
  if (!decoded || decoded.includes("\uFFFD")) return base;
  return decoded;
}

export function storedUploadFilename(originalname: string): string {
  const decoded = decodeUploadName(originalname);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const rawExt = path.extname(decoded);
  const ext = rawExt.replace(/[^.\w]/g, "").slice(0, 32);
  const stem = path
    .basename(decoded, rawExt)
    .replace(/[^\w.\- ()\u0600-\u06FF]+/g, "_")
    .slice(0, 80);
  return `${stem || "file"}-${uniqueSuffix}${ext}`;
}

export function normalizeUploadedFile(file?: Express.Multer.File | null) {
  if (!file) return;
  file.originalname = decodeUploadName(file.originalname || file.filename || "file").slice(0, 255);
  if (file.path) file.path = file.path.replace(/\\/g, "/");
}

export function normalizeUploadedRequest(req: Request) {
  normalizeUploadedFile(req.file);
  const uploaded = req.files;
  if (Array.isArray(uploaded)) {
    uploaded.forEach((file) => normalizeUploadedFile(file));
    return;
  }
  if (uploaded && typeof uploaded === "object") {
    Object.values(uploaded).forEach((group) => {
      if (Array.isArray(group)) group.forEach((file) => normalizeUploadedFile(file));
    });
  }
}
