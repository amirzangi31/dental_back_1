import { Request } from "express";

export const getPagination = (req: Request) => {
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const limitRaw = parseInt((req.query.limit as string) || "20", 10);
  const limit = Math.min(Math.max(limitRaw || 20, 1), 100);
  const offset = (page - 1) * limit;
  const sortParam = (req.query.sort as string) || "desc";
  const sort = sortParam.toLowerCase() === "asc" ? "asc" : "desc";

  return { page, limit, offset, sort };
};

