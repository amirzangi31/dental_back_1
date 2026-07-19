import fs from "fs";
import path from "path";
import { LEGACY_MESSAGE_MAP } from "../locales/legacyMap";
import { MESSAGES } from "../locales/messages";
import { getPrimaryMessage } from "../utils/i18n";

function walk(dir: string, files: string[] = []): string[] {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (p.endsWith(".ts")) files.push(p);
  }
  return files;
}

const roots = ["modules", "middleware", "utils"];
const msgs = new Set<string>();
const patterns = [
  /(?:successResponse|errorResponse)\([^)]*,\s*["'`]([^"'`]+)["'`]/g,
  /(?:successResponse|errorResponse)\(\s*res,\s*\d+,\s*["'`]([^"'`]+)["'`]/g,
];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const content = fs.readFileSync(file, "utf8");
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(content))) msgs.add(m[1]);
    }
  }
}

const unmapped: string[] = [];
for (const msg of [...msgs].sort()) {
  if (msg in MESSAGES) continue;
  if (LEGACY_MESSAGE_MAP[msg]) continue;
  const out = getPrimaryMessage(msg);
  if (out === msg && !/[\u0600-\u06FF]/.test(msg)) unmapped.push(msg);
}

console.log(`Total messages found: ${msgs.size}`);
console.log(`Unmapped English messages: ${unmapped.length}`);
unmapped.forEach((m) => console.log(`- ${m}`));
