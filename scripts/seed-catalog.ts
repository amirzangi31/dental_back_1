import { count } from "drizzle-orm";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { db } from "../db";
import { catalog } from "../db/schema/catalog";
import { category } from "../db/schema/category";
import { categorycolor } from "../db/schema/categorycolor";
import { color } from "../db/schema/color";
import { device } from "../db/schema/device";
import { material } from "../db/schema/material";
import { materialcategory } from "../db/schema/materialcategory";
import { materialshade } from "../db/schema/materialshade";
import { sellerProfile } from "../db/schema/sellerProfile";
import { tax } from "../db/schema/tax";
import { vip } from "../db/schema/vip";
import { volume } from "../db/schema/volume";

const ICON_DIR = path.join(process.cwd(), "uploads", "seed");

const catalogs = [
  {
    title: "پروتز ثابت",
    icon: "fixed.png",
    rgb: [14, 165, 233],
    categories: [
      { title: "روکش زیرکونیا", description: "روکش تمام‌سرامیک زیرکونیا", price: "3500000.00", color: "rgba(125, 211, 252, 1)" },
      { title: "روکش PFM", description: "روکش فلز-سرامیک", price: "2800000.00", color: "rgba(253, 186, 116, 1)" },
      { title: "لمینت", description: "ونیر سرامیکی لبیال", price: "4200000.00", color: "rgba(253, 224, 71, 1)" },
      { title: "اینله و آنله", description: "ترمیم غیرمستقیم", price: "3000000.00", color: "rgba(134, 239, 172, 1)" },
      { title: "بریج", description: "بریج سه واحدی", price: "5000000.00", color: "rgba(196, 181, 253, 1)" },
    ],
  },
  {
    title: "ایمپلنت",
    icon: "implant.png",
    rgb: [249, 115, 22],
    categories: [
      { title: "ایمپلنت تکی", description: "جایگذاری و پروتز ایمپلنت تکی", price: "8000000.00", color: "rgba(251, 146, 60, 1)" },
      { title: "اباتمنت سفارشی", description: "اباتمنت اختصاصی", price: "2200000.00", color: "rgba(248, 113, 113, 1)" },
      { title: "روکش روی ایمپلنت", description: "روکش نهایی روی فیکسچر", price: "4500000.00", color: "rgba(251, 113, 133, 1)" },
    ],
  },
  {
    title: "پروتز متحرک",
    icon: "removable.png",
    rgb: [139, 92, 246],
    categories: [
      { title: "دست‌دندان کامل", description: "پروتز کامل فک", price: "12000000.00", color: "rgba(147, 197, 253, 1)" },
      { title: "پروتز پارسیل", description: "پروتز پارسیل کروم-کبالت", price: "7000000.00", color: "rgba(103, 232, 249, 1)" },
      { title: "نایت‌گارد", description: "محافظ شبانه", price: "1800000.00", color: "rgba(216, 180, 254, 1)" },
    ],
  },
] as const;

const devices = [
  { title: "پارامتر و آپشن ها", file: "mill.png", rgb: [15, 118, 110] },
  { title: "پرینت سه‌بعدی", file: "print.png", rgb: [37, 99, 235] },
  { title: "اسکن داخل‌دهانی", file: "scan.png", rgb: [190, 24, 93] },
] as const;

const shades = [
  ["A1", "A"], ["A2", "A"], ["A3", "A"], ["A3.5", "A"], ["A4", "A"],
  ["B1", "B"], ["B2", "B"], ["B3", "B"], ["B4", "B"],
  ["C1", "C"], ["C2", "C"], ["C3", "C"], ["C4", "C"],
  ["D2", "D"], ["D3", "D"], ["D4", "D"],
  ["0M1", "M"], ["0M2", "M"], ["0M3", "M"],
] as const;

const crc32 = (buf: Buffer) => {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let bit = 0; bit < 8; bit++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
};

const pngChunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const circlePng = (red: number, green: number, blue: number) => {
  const size = 64;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const inside = dx * dx + dy * dy < 28 * 28;
      const index = row + 1 + x * 3;
      raw[index] = inside ? red : 255;
      raw[index + 1] = inside ? green : 255;
      raw[index + 2] = inside ? blue : 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
};

const writeIcon = (fileName: string, rgb: readonly [number, number, number] | number[]) => {
  fs.mkdirSync(ICON_DIR, { recursive: true });
  fs.writeFileSync(path.join(ICON_DIR, fileName), circlePng(rgb[0], rgb[1], rgb[2]));
  return `uploads/seed/${fileName}`;
};

async function seedCatalog() {
  const [{ total }] = await db.select({ total: count() }).from(catalog);
  if (total > 0) {
    console.log("Catalog already has data; seed skipped.");
    return;
  }

  const materialIcon = writeIcon("material.png", [71, 85, 105]);
  const shadeColorGroup = await db
    .insert(categorycolor)
    .values({ title: "رنگ ویتا" })
    .returning({ id: categorycolor.id });
  const shadeColor = await db
    .insert(color)
    .values({ title: "ویتا", code: "rgba(245, 222, 179, 1)", category: shadeColorGroup[0].id })
    .returning({ id: color.id });

  for (const item of shades) {
    await db.insert(materialshade).values({
      title: item[0],
      category: item[1],
      color: shadeColor[0].id,
    });
  }

  for (const item of devices) {
    await db.insert(device).values({
      title: item.title,
      file: writeIcon(item.file, item.rgb),
    });
  }

  const materialGroups = await db
    .insert(materialcategory)
    .values([{ title: "جنس" }, { title: "سیستم ایمپلنت" }, { title: "اسکن تکمیلی" }])
    .returning({ id: materialcategory.id, title: materialcategory.title });
  const groupId = (title: string) => materialGroups.find((group) => group.title === title)!.id;

  for (const catalogItem of catalogs) {
    const icon = writeIcon(catalogItem.icon, catalogItem.rgb);
    const [catalogRow] = await db
      .insert(catalog)
      .values({ title: catalogItem.title })
      .returning({ id: catalog.id });
    const [colorGroup] = await db
      .insert(categorycolor)
      .values({ title: catalogItem.title })
      .returning({ id: categorycolor.id });

    for (const item of catalogItem.categories) {
      const [colorRow] = await db
        .insert(color)
        .values({ title: item.title, code: item.color, category: colorGroup.id })
        .returning({ id: color.id });
      const [categoryRow] = await db
        .insert(category)
        .values({
          title: item.title,
          description: item.description,
          file: icon,
          color: colorRow.id,
          price: item.price,
          catalog: catalogRow.id,
        })
        .returning({ id: category.id });

      await db.insert(volume).values([
        {
          title: "ضخامت",
          defaultvalue: "1.00",
          start: "0.50",
          end: "2.00",
          unit: "mm",
          category: categoryRow.id,
        },
        {
          title: "فاصله مارجین",
          defaultvalue: "0.30",
          start: "0.00",
          end: "1.00",
          unit: "mm",
          category: categoryRow.id,
        },
      ]);

      await db.insert(material).values([
        {
          title: "زیرکونیا مولتی‌لایر",
          price: "900000.00",
          color: colorRow.id,
          descriptionStatus: "none",
          description: "بلوک زیرکونیا چندلایه",
          file: materialIcon,
          materialcategory: groupId("جنس"),
          category: categoryRow.id,
        },
        {
          title: "لیتیوم دیسیلیکات",
          price: "1200000.00",
          color: colorRow.id,
          descriptionStatus: "text",
          inputRequired: true,
          description: "توضیح رنگ یا دستور خاص را بنویسید",
          file: materialIcon,
          materialcategory: groupId("جنس"),
          category: categoryRow.id,
        },
        {
          title: "اسکن بایت",
          price: "400000.00",
          color: colorRow.id,
          descriptionStatus: "none",
          description: "اسکن بایت اضافه",
          file: materialIcon,
          materialcategory: groupId("اسکن تکمیلی"),
          category: categoryRow.id,
        },
      ]);

      if (catalogItem.title === "ایمپلنت") {
        const [parent] = await db
          .insert(material)
          .values({
            title: "سیستم ایمپلنت",
            price: "1500000.00",
            color: colorRow.id,
            descriptionStatus: "none",
            description: "انتخاب برند ایمپلنت",
            file: materialIcon,
            materialcategory: groupId("سیستم ایمپلنت"),
            category: categoryRow.id,
          })
          .returning({ id: material.id });
        await db.insert(material).values([
          {
            title: "اشترومن",
            price: "1800000.00",
            color: colorRow.id,
            descriptionStatus: "none",
            description: "سیستم اشترومن",
            file: materialIcon,
            materialcategory: groupId("سیستم ایمپلنت"),
            category: categoryRow.id,
            parent_id: parent.id,
          },
          {
            title: "نوبل",
            price: "1700000.00",
            color: colorRow.id,
            descriptionStatus: "none",
            description: "سیستم نوبل",
            file: materialIcon,
            materialcategory: groupId("سیستم ایمپلنت"),
            category: categoryRow.id,
            parent_id: parent.id,
          },
        ]);
      }
    }
  }

  await db.insert(tax).values({ title: "مالیات بر ارزش افزوده", percent: "10.00" });
  await db.insert(vip).values({
    percent: "20.00",
    description: "تحویل سریع",
    startTime: "09:00:00",
    endTime: "18:00:00",
  });
  await db.insert(sellerProfile).values({
    id: 1,
    singletonKey: 1,
    name: "لابراتوار دیجیتال دنتال آرت",
    economicNumber: "411234567890",
    nationalId: "10123456789",
    registrationNumber: "123456",
    postalCode: "1234567890",
    city: "تهران",
    address: "تهران، خیابان مثال، پلاک ۱",
    phone: "02100000000",
  });

  console.log("Catalog seed completed.");
}

seedCatalog()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed catalog:", error);
    process.exit(1);
  });
