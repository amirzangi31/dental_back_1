import path from "path";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { files } from "../db/schema/files";
import { decodeUploadName } from "./uploadFilename";

const hasExtension = (name: string) => /\.[a-z0-9]{1,12}$/i.test(name);

export function attachmentDisposition(filename: string) {
  const base = path.posix.basename(filename).replace(/[\r\n"]/g, "").trim() || "file";
  const ascii = base.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "file";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(base)}`;
}

export async function downloadNameForStoredPath(storedPath: string) {
  const normalized = storedPath.replace(/\\/g, "/");
  const fallback = path.posix.basename(normalized) || "file";
  try {
    const [row] = await db
      .select({ originalname: files.originalname })
      .from(files)
      .where(eq(files.path, normalized))
      .orderBy(desc(files.id))
      .limit(1);
    const named = row?.originalname ? path.posix.basename(decodeUploadName(row.originalname)) : "";
    if (named && (hasExtension(named) || !hasExtension(fallback))) return named;
    return fallback;
  } catch (error) {
    console.error("download name lookup:", error);
    return fallback;
  }
}
