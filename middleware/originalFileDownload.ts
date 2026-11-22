import { NextFunction, Request, Response } from "express";
import path from "path";
import { attachmentDisposition, downloadNameForStoredPath } from "../utils/storedFileDownload";

export const originalDownloadNameHeader = (prefix: "uploads" | "order-files") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.query.download !== "1") {
      return next();
    }
    try {
      const decoded = decodeURIComponent(req.path);
      const safe = path.posix.normalize(decoded).replace(/^(\.\.(\/|$))+/, "");
      if (!safe || safe === "/" || safe.includes("..")) return next();
      const stored = `${prefix}/${safe.replace(/^\/+/, "")}`.replace(/\/+/g, "/");
      const name = await downloadNameForStoredPath(stored);
      res.setHeader("Content-Disposition", attachmentDisposition(name));
    } catch (error) {
      console.error("original download name:", error);
    }
    next();
  };
};
