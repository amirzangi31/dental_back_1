import { Request } from "express";
import { and, AnyColumn, eq, or, SQL, sql } from "drizzle-orm";

export const readQuery = (req: Request, key: string): string => {
  const raw = req.query[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return "";
  return value.trim();
};

/** Text search. Accepts `q` or `search`. */
export const searchText = (req: Request): string =>
  readQuery(req, "q") || readQuery(req, "search");

const likePattern = (value: string) =>
  `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

export const matchesText = (
  q: string,
  columns: AnyColumn[],
): SQL | undefined => {
  const term = q.trim();
  if (!term || columns.length === 0) return undefined;
  const pattern = likePattern(term);
  const clauses = columns.map(
    (column) => sql`${column}::text ILIKE ${pattern} ESCAPE '\\'`,
  );
  return clauses.length === 1 ? clauses[0] : or(...clauses);
};

export const combineFilters = (
  ...parts: Array<SQL | undefined>
): SQL | undefined => {
  const filters = parts.filter((part): part is SQL => part !== undefined);
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...filters);
};

export const oneOf = <T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): { ok: true; value?: T } | { ok: false; error: string } => {
  if (!value) return { ok: true };
  if (!allowed.includes(value as T)) {
    return { ok: false, error: `Invalid ${label}` };
  }
  return { ok: true, value: value as T };
};

export const booleanQuery = (
  value: string,
  label: string,
): { ok: true; value?: boolean } | { ok: false; error: string } => {
  if (!value) return { ok: true };
  if (value !== "true" && value !== "false") {
    return { ok: false, error: `Invalid ${label}` };
  }
  return { ok: true, value: value === "true" };
};

export const idQuery = (
  value: string,
  column: AnyColumn,
  label: string,
): { ok: true; clause?: SQL } | { ok: false; error: string } => {
  if (!value) return { ok: true };
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { ok: false, error: `Invalid ${label}` };
  }
  return { ok: true, clause: eq(column as never, parsed) };
};
