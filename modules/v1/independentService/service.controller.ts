import { Request, Response } from "express";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { color } from "../../../db/schema/color";
import {
  independentService,
  independentServiceCategory,
  independentServiceOption,
} from "../../../db/schema/independentService";
import { errorResponse, successResponse } from "../../../utils/responses";
import { getPagination } from "../../../utils/pagination";
import { combineFilters, idQuery, matchesText, readQuery, searchText } from "../../../utils/listQuery";
import { parseDefinedPrice } from "../../../utils/parseDefinedPrice";

type OptionInput = {
  id?: number | null;
  title: string;
  price: number;
  color: number;
  allowFile?: boolean;
  sortOrder?: number;
};

type ColorDetail = { id: number; color: string | null; title: string | null } | null;

const colorDetail = (
  id: number | null | undefined,
  code: string | null | undefined,
  title: string | null | undefined,
): ColorDetail => (id ? { id, color: code ?? null, title: title ?? null } : null);

const uploadedFiles = (req: Request) =>
  (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];

const optionFilePath = (req: Request, index: number) =>
  uploadedFiles(req).find((file) => file.fieldname === `optionFile_${index}`)?.path ?? null;

type LoadedOption = typeof independentServiceOption.$inferSelect & { colorDetail: ColorDetail };

const loadOptions = async (serviceIds: number[]) => {
  if (serviceIds.length === 0) return new Map<number, LoadedOption[]>();
  const rows = await db
    .select({
      option: independentServiceOption,
      colorId: color.id,
      colorCode: color.code,
      colorTitle: color.title,
    })
    .from(independentServiceOption)
    .leftJoin(color, eq(independentServiceOption.color, color.id))
    .where(
      and(
        inArray(independentServiceOption.serviceId, serviceIds),
        eq(independentServiceOption.isDeleted, 0),
      ),
    )
    .orderBy(asc(independentServiceOption.sortOrder), asc(independentServiceOption.id));
  const grouped = new Map<number, LoadedOption[]>();
  for (const row of rows) {
    const list = grouped.get(row.option.serviceId) ?? [];
    list.push({
      ...row.option,
      colorDetail: colorDetail(row.colorId, row.colorCode, row.colorTitle),
    });
    grouped.set(row.option.serviceId, list);
  }
  return grouped;
};

const toOption = (row: LoadedOption) => ({
  id: row.id,
  title: row.title,
  file: row.file,
  price: row.price,
  color: row.colorDetail,
  allowFile: row.allowFile,
  sortOrder: row.sortOrder,
});

const toService = (
  row: typeof independentService.$inferSelect & {
    categoryTitle?: string | null;
    colorDetail?: ColorDetail;
  },
  options: LoadedOption[],
) => ({
  id: row.id,
  title: row.title,
  categoryId: row.categoryId,
  categoryTitle: row.categoryTitle ?? null,
  type: row.type,
  price: row.price,
  color: row.colorDetail ?? null,
  allowFile: row.allowFile,
  active: row.active,
  sortOrder: row.sortOrder,
  options: options.map(toOption),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const saveOptions = async (
  serviceId: number,
  options: OptionInput[],
  req: Request,
) => {
  const existing = await db
    .select()
    .from(independentServiceOption)
    .where(
      and(
        eq(independentServiceOption.serviceId, serviceId),
        eq(independentServiceOption.isDeleted, 0),
      ),
    );
  const kept = new Set<number>();
  for (const [index, option] of options.entries()) {
    const uploaded = optionFilePath(req, index);
    const price = Number(option.price).toFixed(2);
    const sortOrder = option.sortOrder ?? index;
    if (option.id) {
      const current = existing.find((row) => row.id === option.id);
      if (!current) {
        throw new Error("INDEPENDENT_OPTION_INVALID");
      }
      kept.add(option.id);
      await db
        .update(independentServiceOption)
        .set({
          title: option.title.trim(),
          price,
          color: option.color,
          allowFile: Boolean(option.allowFile),
          sortOrder,
          file: uploaded ?? current.file,
          updatedAt: new Date(),
        })
        .where(eq(independentServiceOption.id, option.id));
    } else {
      await db.insert(independentServiceOption).values({
        serviceId,
        title: option.title.trim(),
        price,
        color: option.color,
        allowFile: Boolean(option.allowFile),
        sortOrder,
        file: uploaded,
      });
    }
  }
  const removed = existing.filter((row) => !kept.has(row.id)).map((row) => row.id);
  if (removed.length) {
    await db
      .update(independentServiceOption)
      .set({ isDeleted: 1, updatedAt: new Date() })
      .where(inArray(independentServiceOption.id, removed));
  }
};

export const listIndependentServices = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const categoryFilter = idQuery(
      readQuery(req, "category"),
      independentService.categoryId,
      "category",
    );
    if (!categoryFilter.ok) return errorResponse(res, 400, categoryFilter.error, null);
    const whereClause = combineFilters(
      eq(independentService.isDeleted, 0),
      categoryFilter.clause,
      matchesText(searchText(req), [independentService.id, independentService.title]),
    );
    const orderByClause =
      sort === "desc" ? desc(independentService.createdAt) : asc(independentService.sortOrder);
    const [{ total }] = await db.select({ total: count() }).from(independentService).where(whereClause);
    const rows = await db
      .select({
        id: independentService.id,
        title: independentService.title,
        categoryId: independentService.categoryId,
        categoryTitle: independentServiceCategory.title,
        type: independentService.type,
        price: independentService.price,
        colorId: color.id,
        colorCode: color.code,
        colorTitle: color.title,
        allowFile: independentService.allowFile,
        active: independentService.active,
        sortOrder: independentService.sortOrder,
        isDeleted: independentService.isDeleted,
        createdAt: independentService.createdAt,
        updatedAt: independentService.updatedAt,
      })
      .from(independentService)
      .leftJoin(
        independentServiceCategory,
        eq(independentService.categoryId, independentServiceCategory.id),
      )
      .leftJoin(color, eq(independentService.color, color.id))
      .where(whereClause)
      .orderBy(orderByClause, asc(independentService.id))
      .limit(limit)
      .offset(offset);
    const options = await loadOptions(rows.map((row) => row.id));
    return successResponse(
      res,
      200,
      {
        items: rows.map((row) =>
          toService(
            {
              ...row,
              color: row.colorId,
              colorDetail: colorDetail(row.colorId, row.colorCode, row.colorTitle),
            },
            options.get(row.id) ?? [],
          ),
        ),
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "INDEPENDENT_SERVICE_LIST",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getIndependentService = async (req: Request, res: Response) => {
  try {
    const [row] = await db
      .select({
        id: independentService.id,
        title: independentService.title,
        categoryId: independentService.categoryId,
        categoryTitle: independentServiceCategory.title,
        type: independentService.type,
        price: independentService.price,
        colorId: color.id,
        colorCode: color.code,
        colorTitle: color.title,
        allowFile: independentService.allowFile,
        active: independentService.active,
        sortOrder: independentService.sortOrder,
        isDeleted: independentService.isDeleted,
        createdAt: independentService.createdAt,
        updatedAt: independentService.updatedAt,
      })
      .from(independentService)
      .leftJoin(
        independentServiceCategory,
        eq(independentService.categoryId, independentServiceCategory.id),
      )
      .leftJoin(color, eq(independentService.color, color.id))
      .where(
        and(eq(independentService.id, Number(req.params.id)), eq(independentService.isDeleted, 0)),
      )
      .limit(1);
    if (!row) return errorResponse(res, 404, "INDEPENDENT_SERVICE_NOT_FOUND", null);
    const options = await loadOptions([row.id]);
    return successResponse(
      res,
      200,
      toService(
        {
          ...row,
          color: row.colorId,
          colorDetail: colorDetail(row.colorId, row.colorCode, row.colorTitle),
        },
        options.get(row.id) ?? [],
      ),
      "INDEPENDENT_SERVICE_LIST",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

const assertCategory = async (categoryId: number) => {
  const [category] = await db
    .select({ id: independentServiceCategory.id })
    .from(independentServiceCategory)
    .where(
      and(
        eq(independentServiceCategory.id, categoryId),
        eq(independentServiceCategory.isDeleted, 0),
      ),
    )
    .limit(1);
  return Boolean(category);
};

const assertColors = async (ids: number[]) => {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return true;
  const rows = await db
    .select({ id: color.id })
    .from(color)
    .where(and(inArray(color.id, unique), eq(color.isDeleted, 0)));
  return rows.length === unique.length;
};

const writeService = async (req: Request, res: Response, serviceId?: number) => {
  const type = req.body.type as "options" | "file";
  const categoryId = Number(req.body.categoryId);
  if (!(await assertCategory(categoryId))) {
    return errorResponse(res, 400, "INDEPENDENT_CATEGORY_NOT_FOUND", null);
  }
  const optionsInput = (req.body.options ?? []) as OptionInput[];
  const serviceColor = type === "file" ? Number(req.body.color) : null;
  const colorIds = [
    ...(serviceColor ? [serviceColor] : []),
    ...(type === "options" ? optionsInput.map((option) => Number(option.color)) : []),
  ];
  if (!(await assertColors(colorIds))) {
    return errorResponse(res, 400, "COLOR_NOT_FOUND", null);
  }
  const price =
    type === "file" && parseDefinedPrice(req.body.price) !== null
      ? Number(req.body.price).toFixed(2)
      : null;
  const values = {
    title: String(req.body.title).trim(),
    categoryId,
    type,
    price,
    color: serviceColor,
    allowFile: type === "file" ? Boolean(req.body.allowFile) : false,
    active: req.body.active === undefined ? true : Boolean(req.body.active),
    sortOrder: Number(req.body.sortOrder ?? 0),
    updatedAt: new Date(),
  };
  const [saved] = serviceId
    ? await db
        .update(independentService)
        .set(values)
        .where(and(eq(independentService.id, serviceId), eq(independentService.isDeleted, 0)))
        .returning()
    : await db.insert(independentService).values(values).returning();
  if (!saved) return errorResponse(res, 404, "INDEPENDENT_SERVICE_NOT_FOUND", null);
  if (type === "options") {
    await saveOptions(saved.id, optionsInput, req);
    await db
      .update(independentService)
      .set({ price: null, color: null })
      .where(eq(independentService.id, saved.id));
  } else {
    await db
      .update(independentServiceOption)
      .set({ isDeleted: 1, updatedAt: new Date() })
      .where(eq(independentServiceOption.serviceId, saved.id));
  }
  const options = await loadOptions([saved.id]);
  const [category] = await db
    .select({ title: independentServiceCategory.title })
    .from(independentServiceCategory)
    .where(eq(independentServiceCategory.id, saved.categoryId))
    .limit(1);
  const [savedColor] = saved.color
    ? await db
        .select({ id: color.id, code: color.code, title: color.title })
        .from(color)
        .where(eq(color.id, saved.color))
        .limit(1)
    : [];
  return successResponse(
    res,
    serviceId ? 200 : 201,
    toService(
      {
        ...saved,
        price,
        color: type === "options" ? null : saved.color,
        categoryTitle: category?.title ?? null,
        colorDetail: colorDetail(savedColor?.id, savedColor?.code, savedColor?.title),
      },
      options.get(saved.id) ?? [],
    ),
    serviceId ? "INDEPENDENT_SERVICE_UPDATED" : "INDEPENDENT_SERVICE_CREATED",
  );
};

export const createIndependentService = async (req: Request, res: Response) => {
  try {
    return await writeService(req, res);
  } catch (error) {
    if (error instanceof Error && error.message === "INDEPENDENT_OPTION_INVALID") {
      return errorResponse(res, 400, "INDEPENDENT_OPTION_INVALID", null);
    }
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateIndependentService = async (req: Request, res: Response) => {
  try {
    return await writeService(req, res, Number(req.params.id));
  } catch (error) {
    if (error instanceof Error && error.message === "INDEPENDENT_OPTION_INVALID") {
      return errorResponse(res, 400, "INDEPENDENT_OPTION_INVALID", null);
    }
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteIndependentService = async (req: Request, res: Response) => {
  try {
    const [deleted] = await db
      .update(independentService)
      .set({ isDeleted: 1, active: false, updatedAt: new Date() })
      .where(and(eq(independentService.id, Number(req.params.id)), eq(independentService.isDeleted, 0)))
      .returning();
    if (!deleted) return errorResponse(res, 404, "INDEPENDENT_SERVICE_NOT_FOUND", null);
    return successResponse(res, 200, {}, "INDEPENDENT_SERVICE_DELETED");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const independentServiceCatalog = async (_req: Request, res: Response) => {
  try {
    const categories = await db
      .select()
      .from(independentServiceCategory)
      .where(
        and(
          eq(independentServiceCategory.isDeleted, 0),
          eq(independentServiceCategory.active, true),
        ),
      )
      .orderBy(asc(independentServiceCategory.sortOrder), asc(independentServiceCategory.id));
    if (categories.length === 0) {
      return successResponse(res, 200, [], "INDEPENDENT_SERVICE_LIST");
    }
    const services = await db
      .select()
      .from(independentService)
      .where(
        and(
          eq(independentService.isDeleted, 0),
          eq(independentService.active, true),
          inArray(
            independentService.categoryId,
            categories.map((category) => category.id),
          ),
        ),
      )
      .orderBy(asc(independentService.sortOrder), asc(independentService.id));
    const options = await loadOptions(services.map((service) => service.id));
    const colorIds = services
      .map((service) => service.color)
      .filter((id): id is number => typeof id === "number");
    const colorRows = colorIds.length
      ? await db
          .select({ id: color.id, color: color.code, title: color.title })
          .from(color)
          .where(inArray(color.id, colorIds))
      : [];
    const colorsById = new Map(colorRows.map((row) => [row.id, row]));
    const payload = categories
      .map((category) => ({
        id: category.id,
        title: category.title,
        services: services
          .filter((service) => service.categoryId === category.id)
          .map((service) => ({
            id: service.id,
            title: service.title,
            type: service.type,
            price: service.price,
            allowFile: service.allowFile,
            color: service.color ? (colorsById.get(service.color) ?? null) : null,
            options:
              service.type === "options"
                ? (options.get(service.id) ?? []).map(toOption)
                : [],
          }))
          .filter((service) => service.type === "file" || service.options.length > 0),
      }))
      .filter((category) => category.services.length > 0);
    return successResponse(res, 200, payload, "INDEPENDENT_SERVICE_LIST");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
