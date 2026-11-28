import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { files } from "../../../db/schema/files";
import {
  independentService,
  independentServiceCategory,
  independentServiceOption,
  orderIndependentService,
  orderIndependentServiceFile,
} from "../../../db/schema/independentService";
import { parseDefinedPrice } from "../../../utils/parseDefinedPrice";
import { MAX_UPLOAD_FILES } from "../../../utils/uploadLimits";

export type JawArch = "top" | "bottom";

export type ResolvedIndependentLine = {
  serviceId: number;
  optionId: number | null;
  serviceTitle: string;
  optionTitle: string | null;
  price: number;
  fileIds: number[];
  arch: JawArch | null;
};

export type IndependentServiceSnapshotFile = {
  id: number;
  originalname: string;
  path: string;
  mimetype: string | null;
};

export type IndependentServiceSnapshot = {
  id: number;
  orderId: number;
  serviceId: number | null;
  optionId: number | null;
  serviceTitle: string;
  optionTitle: string | null;
  price: string;
  arch: JawArch | null;
  files: IndependentServiceSnapshotFile[];
};

export type IndependentPricePart = {
  description: string;
  quantity: number;
  beforeTaxToman: number;
};

type SelectionParse =
  | {
      ok: true;
      optionIds: number[];
      optionArch: Map<number, JawArch[]>;
      optionFiles: Map<number, number[]>;
      fileServices: { serviceId: number; fileIds: number[]; arches: JawArch[] }[];
      arch: JawArch | null;
    }
  | { ok: false; message: string };

const readArch = (value: unknown): JawArch | null | false => {
  if (value == null || value === "") return null;
  if (value === "top" || value === "bottom") return value;
  return false;
};

const readArchList = (value: unknown): JawArch[] | false => {
  if (!Array.isArray(value)) return false;
  const arches: JawArch[] = [];
  for (const raw of value) {
    const arch = readArch(raw);
    if (arch === false) return false;
    if (arch && !arches.includes(arch)) arches.push(arch);
  }
  return arches;
};

const positiveId = (value: unknown) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const pushUnique = (list: number[], id: number) => {
  if (!list.includes(id)) list.push(id);
};

export const independentServiceDescription = (
  serviceTitle: string,
  optionTitle: string | null | undefined,
) => (optionTitle ? `${serviceTitle} - ${optionTitle}` : serviceTitle);

export const parseIndependentSelection = (input: unknown): SelectionParse => {
  if (input == null) {
    return { ok: true, optionIds: [], optionArch: new Map(), optionFiles: new Map(), fileServices: [], arch: null };
  }
  if (typeof input !== "object") {
    return { ok: false, message: "INDEPENDENT_SERVICE_INVALID" };
  }
  const body = input as {
    optionIds?: unknown;
    optionArches?: unknown;
    optionFiles?: unknown;
    fileServices?: unknown;
    arch?: unknown;
  };
  const arch = readArch(body.arch);
  if (arch === false) return { ok: false, message: "INDEPENDENT_SERVICE_INVALID" };
  const optionArch = new Map<number, JawArch[]>();
  if (body.optionArches != null) {
    if (!Array.isArray(body.optionArches)) {
      return { ok: false, message: "INDEPENDENT_SERVICE_INVALID" };
    }
    for (const raw of body.optionArches) {
      const optionId = positiveId((raw as { optionId?: unknown })?.optionId);
      const itemArch = readArch((raw as { arch?: unknown })?.arch);
      if (!optionId || itemArch === false) {
        return { ok: false, message: "INDEPENDENT_OPTION_INVALID" };
      }
      if (!itemArch) continue;
      const arches = optionArch.get(optionId) ?? [];
      if (!arches.includes(itemArch)) arches.push(itemArch);
      optionArch.set(optionId, arches);
    }
  }
  const optionIds: number[] = [];
  if (body.optionIds != null) {
    if (!Array.isArray(body.optionIds)) {
      return { ok: false, message: "INDEPENDENT_SERVICE_INVALID" };
    }
    for (const raw of body.optionIds) {
      const id = positiveId(raw);
      if (!id) return { ok: false, message: "INDEPENDENT_OPTION_INVALID" };
      pushUnique(optionIds, id);
    }
  }
  const optionFiles = new Map<number, number[]>();
  if (body.optionFiles != null) {
    if (!Array.isArray(body.optionFiles)) {
      return { ok: false, message: "INDEPENDENT_SERVICE_INVALID" };
    }
    for (const raw of body.optionFiles) {
      const optionId = positiveId((raw as { optionId?: unknown })?.optionId);
      if (!optionId) return { ok: false, message: "INDEPENDENT_OPTION_INVALID" };
      const rawFiles = (raw as { fileIds?: unknown }).fileIds;
      if (rawFiles != null && !Array.isArray(rawFiles)) {
        return { ok: false, message: "INDEPENDENT_FILE_INVALID" };
      }
      const fileIds = optionFiles.get(optionId) ?? [];
      for (const fileRaw of Array.isArray(rawFiles) ? rawFiles : []) {
        const fileId = positiveId(fileRaw);
        if (!fileId) return { ok: false, message: "INDEPENDENT_FILE_INVALID" };
        pushUnique(fileIds, fileId);
      }
      if (fileIds.length > MAX_UPLOAD_FILES) {
        return { ok: false, message: "INDEPENDENT_FILE_INVALID" };
      }
      optionFiles.set(optionId, fileIds);
    }
  }
  const grouped = new Map<number, { fileIds: number[]; arches: JawArch[] }>();
  if (body.fileServices != null) {
    if (!Array.isArray(body.fileServices)) {
      return { ok: false, message: "INDEPENDENT_SERVICE_INVALID" };
    }
    for (const item of body.fileServices) {
      const serviceId = positiveId((item as { serviceId?: unknown })?.serviceId);
      if (!serviceId) return { ok: false, message: "INDEPENDENT_FILE_SERVICE_INVALID" };
      const rawItem = item as { arches?: unknown; arch?: unknown; fileIds?: unknown };
      let itemArches: JawArch[] = [];
      if (rawItem.arches != null) {
        const parsedArches = readArchList(rawItem.arches);
        if (parsedArches === false) return { ok: false, message: "INDEPENDENT_SERVICE_INVALID" };
        itemArches = parsedArches;
      } else {
        const itemArch = readArch(rawItem.arch);
        if (itemArch === false) return { ok: false, message: "INDEPENDENT_SERVICE_INVALID" };
        if (itemArch) itemArches = [itemArch];
      }
      const rawFiles = rawItem.fileIds;
      if (rawFiles != null && !Array.isArray(rawFiles)) {
        return { ok: false, message: "INDEPENDENT_FILE_INVALID" };
      }
      const current = grouped.get(serviceId) ?? { fileIds: [], arches: [] };
      for (const itemArch of itemArches) {
        if (!current.arches.includes(itemArch)) current.arches.push(itemArch);
      }
      for (const raw of Array.isArray(rawFiles) ? rawFiles : []) {
        const fileId = positiveId(raw);
        if (!fileId) return { ok: false, message: "INDEPENDENT_FILE_INVALID" };
        pushUnique(current.fileIds, fileId);
      }
      if (current.fileIds.length > MAX_UPLOAD_FILES) {
        return { ok: false, message: "INDEPENDENT_FILE_INVALID" };
      }
      grouped.set(serviceId, current);
    }
  }
  return {
    ok: true,
    optionIds,
    optionArch,
    optionFiles,
    arch,
    fileServices: [...grouped.entries()]
      .filter(([, item]) => item.fileIds.length > 0 || item.arches.length > 0)
      .map(([serviceId, item]) => ({ serviceId, fileIds: item.fileIds, arches: item.arches })),
  };
};

export const resolveIndependentSelection = async (
  input: unknown,
  options?: { userId?: number; requireOwnedFiles?: boolean },
) => {
  const parsed = parseIndependentSelection(input);
  if (!parsed.ok) return parsed;
  const lines: ResolvedIndependentLine[] = [];
  const ownedIds = new Set<number>();
  if (options?.requireOwnedFiles) {
    const fileIds = [
      ...new Set([
        ...parsed.fileServices.flatMap((item) => item.fileIds),
        ...parsed.optionIds.flatMap((optionId) => parsed.optionFiles.get(optionId) ?? []),
      ]),
    ];
    if (fileIds.length > 0) {
      const userId = options.userId;
      if (!userId) return { ok: false as const, message: "INDEPENDENT_FILE_INVALID" };
      const owned = await db
        .select({ id: files.id })
        .from(files)
        .where(and(inArray(files.id, fileIds), eq(files.user_id, userId), eq(files.isDeleted, 0)));
      if (owned.length !== fileIds.length) {
        return { ok: false as const, message: "INDEPENDENT_FILE_INVALID" };
      }
      owned.forEach((row) => ownedIds.add(row.id));
    }
  }

  if (parsed.optionIds.length > 0) {
    const rows = await db
      .select({
        optionId: independentServiceOption.id,
        optionTitle: independentServiceOption.title,
        optionPrice: independentServiceOption.price,
        optionDeleted: independentServiceOption.isDeleted,
        serviceId: independentService.id,
        serviceTitle: independentService.title,
        serviceType: independentService.type,
        serviceActive: independentService.active,
        serviceDeleted: independentService.isDeleted,
        categoryActive: independentServiceCategory.active,
        categoryDeleted: independentServiceCategory.isDeleted,
      })
      .from(independentServiceOption)
      .innerJoin(
        independentService,
        eq(independentServiceOption.serviceId, independentService.id),
      )
      .innerJoin(
        independentServiceCategory,
        eq(independentService.categoryId, independentServiceCategory.id),
      )
      .where(inArray(independentServiceOption.id, parsed.optionIds));

    if (rows.length !== parsed.optionIds.length) {
      return { ok: false as const, message: "INDEPENDENT_OPTION_INVALID" };
    }
    const byId = new Map(rows.map((row) => [row.optionId, row]));
    for (const optionId of parsed.optionIds) {
      const row = byId.get(optionId);
      if (
        !row ||
        row.optionDeleted !== 0 ||
        row.serviceDeleted !== 0 ||
        row.categoryDeleted !== 0 ||
        !row.serviceActive ||
        !row.categoryActive ||
        row.serviceType !== "options"
      ) {
        return { ok: false as const, message: "INDEPENDENT_OPTION_INVALID" };
      }
      const price = parseDefinedPrice(row.optionPrice);
      if (price === null || price < 0) {
        return { ok: false as const, message: "INDEPENDENT_OPTION_INVALID" };
      }
      const optionFileIds = parsed.optionFiles.get(optionId) ?? [];
      if (options?.requireOwnedFiles && optionFileIds.some((id) => !ownedIds.has(id))) {
        return { ok: false as const, message: "INDEPENDENT_FILE_INVALID" };
      }
      const optionArches = parsed.optionArch.get(optionId) ?? [];
      const targets = optionArches.length > 0 ? optionArches : [parsed.arch];
      for (const arch of targets) {
        lines.push({
          serviceId: row.serviceId,
          optionId: row.optionId,
          serviceTitle: row.serviceTitle,
          optionTitle: row.optionTitle,
          price,
          fileIds: optionFileIds,
          arch,
        });
      }
    }
  }

  if (parsed.fileServices.length > 0) {
    const serviceIds = parsed.fileServices.map((item) => item.serviceId);
    const rows = await db
      .select({
        serviceId: independentService.id,
        serviceTitle: independentService.title,
        serviceType: independentService.type,
        servicePrice: independentService.price,
        serviceActive: independentService.active,
        serviceDeleted: independentService.isDeleted,
        categoryActive: independentServiceCategory.active,
        categoryDeleted: independentServiceCategory.isDeleted,
      })
      .from(independentService)
      .innerJoin(
        independentServiceCategory,
        eq(independentService.categoryId, independentServiceCategory.id),
      )
      .where(inArray(independentService.id, serviceIds));
    if (rows.length !== serviceIds.length) {
      return { ok: false as const, message: "INDEPENDENT_FILE_SERVICE_INVALID" };
    }
    const byId = new Map(rows.map((row) => [row.serviceId, row]));
    for (const item of parsed.fileServices) {
      const row = byId.get(item.serviceId);
      if (
        !row ||
        row.serviceDeleted !== 0 ||
        row.categoryDeleted !== 0 ||
        !row.serviceActive ||
        !row.categoryActive ||
        row.serviceType !== "file"
      ) {
        return { ok: false as const, message: "INDEPENDENT_FILE_SERVICE_INVALID" };
      }
      const price = parseDefinedPrice(row.servicePrice);
      if (price === null || price < 0) {
        return { ok: false as const, message: "INDEPENDENT_FILE_SERVICE_INVALID" };
      }
      if (options?.requireOwnedFiles && item.fileIds.some((id) => !ownedIds.has(id))) {
        return { ok: false as const, message: "INDEPENDENT_FILE_INVALID" };
      }
      const targets = item.arches.length > 0 ? item.arches : [parsed.arch];
      for (const arch of targets) {
        lines.push({
          serviceId: row.serviceId,
          optionId: null,
          serviceTitle: row.serviceTitle,
          optionTitle: null,
          price,
          fileIds: item.fileIds,
          arch,
        });
      }
    }
  }

  const subtotal = lines.reduce((sum, line) => sum + line.price, 0);
  return { ok: true as const, lines, subtotal };
};

export const insertIndependentLines = async (
  executor: any,
  orderId: number,
  lines: ResolvedIndependentLine[],
) => {
  for (const [index, line] of lines.entries()) {
    const [created] = await executor
      .insert(orderIndependentService)
      .values({
        orderId,
        serviceId: line.serviceId,
        optionId: line.optionId,
        serviceTitle: line.serviceTitle,
        optionTitle: line.optionTitle,
        price: line.price.toFixed(2),
        arch: line.arch,
        sortOrder: index,
      })
      .returning();
    if (line.fileIds.length > 0) {
      await executor.insert(orderIndependentServiceFile).values(
        line.fileIds.map((fileId) => ({
          itemId: created.id,
          fileId,
        })),
      );
    }
  }
};

const groupSnapshots = (
  rows: {
    id: number;
    orderId: number;
    serviceId: number | null;
    optionId: number | null;
    serviceTitle: string;
    optionTitle: string | null;
    price: string;
    arch: string | null;
    fileId: number | null;
    originalname: string | null;
    path: string | null;
    mimetype: string | null;
  }[],
) => {
  const grouped = new Map<number, IndependentServiceSnapshot[]>();
  const seen = new Map<number, IndependentServiceSnapshot>();
  for (const row of rows) {
    let item = seen.get(row.id);
    if (!item) {
      item = {
        id: row.id,
        orderId: row.orderId,
        serviceId: row.serviceId,
        optionId: row.optionId,
        serviceTitle: row.serviceTitle,
        optionTitle: row.optionTitle,
        price: row.price,
        arch: row.arch === "top" || row.arch === "bottom" ? row.arch : null,
        files: [],
      };
      seen.set(row.id, item);
      const list = grouped.get(row.orderId) ?? [];
      list.push(item);
      grouped.set(row.orderId, list);
    }
    if (row.fileId && row.path) {
      item.files.push({
        id: row.fileId,
        originalname: row.originalname || row.path,
        path: row.path,
        mimetype: row.mimetype,
      });
    }
  }
  return grouped;
};

export const loadIndependentServicesByOrders = async (
  executor: any,
  orderIds: number[],
) => {
  if (orderIds.length === 0) return new Map<number, IndependentServiceSnapshot[]>();
  const rows = await executor
    .select({
      id: orderIndependentService.id,
      orderId: orderIndependentService.orderId,
      serviceId: orderIndependentService.serviceId,
      optionId: orderIndependentService.optionId,
      serviceTitle: orderIndependentService.serviceTitle,
      optionTitle: orderIndependentService.optionTitle,
      price: orderIndependentService.price,
      arch: orderIndependentService.arch,
      fileId: files.id,
      originalname: files.originalname,
      path: files.path,
      mimetype: files.mimetype,
    })
    .from(orderIndependentService)
    .leftJoin(
      orderIndependentServiceFile,
      eq(orderIndependentServiceFile.itemId, orderIndependentService.id),
    )
    .leftJoin(files, eq(files.id, orderIndependentServiceFile.fileId))
    .where(inArray(orderIndependentService.orderId, orderIds))
    .orderBy(asc(orderIndependentService.sortOrder), asc(orderIndependentService.id));
  return groupSnapshots(rows);
};

export const sumIndependentServiceSnapshots = async (executor: any, orderId: number) => {
  const grouped = await loadIndependentServicesByOrders(executor, [orderId]);
  return (grouped.get(orderId) ?? []).reduce((sum, item) => sum + Number(item.price || 0), 0);
};

export const independentServicePriceParts = (
  items: IndependentServiceSnapshot[],
): IndependentPricePart[] =>
  items.map((item) => ({
    description: independentServiceDescription(item.serviceTitle, item.optionTitle),
    quantity: 1,
    beforeTaxToman: Number(item.price || 0),
  }));

export const quoteIndependentServices = (lines: ResolvedIndependentLine[]) =>
  lines.map((line) => ({
    serviceId: line.serviceId,
    optionId: line.optionId,
    serviceTitle: line.serviceTitle,
    optionTitle: line.optionTitle,
    price: line.price,
    fileIds: line.fileIds,
    arch: line.arch,
  }));
