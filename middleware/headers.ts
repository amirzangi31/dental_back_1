import { Request, Response, NextFunction } from "express";

export const setHeaders = (req: Request, res: Response, next: NextFunction) => {
  // CORS را پکیج cors در app.ts مدیریت می‌کند؛ اینجا فقط OPTIONS را رد نکن
  next();
};
