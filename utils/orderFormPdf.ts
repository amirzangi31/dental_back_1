import path from "path";
import fs from "fs";
import { enablePersianPdfText } from "./persianPdfText";

const PAGE_WIDTH = 595.28;
const MARGIN = 28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const GAP = 8;
const BOX_RADIUS = 6;
const BOX_BG = "#F0F0F0";
const LABEL_COLOR = "#888888";
const VALUE_COLOR = "#333333";
const SECTION_COLOR = "#666666";

export type DownloadableFile = {
  label?: string;
  name: string;
  url: string;
  comment?: string | null;
};

export type OrderPdfTooth = {
  toothnumber: number | null;
  categoryName: string;
  colorLabel: string;
  deviceTitle: string;
  services: string;
};

export type OrderPdfData = {
  hiddenField: string;
  userType: string;
  doctorName: string;
  patientName: string;
  gender: string;
  colorType: string;
  shade: string;
  teeth: OrderPdfTooth[];
  connections?: number[];
  volumes: { label: string; value: string }[];
  downloadableFiles: DownloadableFile[];
  doctorComments: string;
};

type FileImageMeta = {
  toothnumber: number | null;
  text: string | null;
  section?: string | null;
};

type MaterialImage = {
  filePath: string;
  meta: FileImageMeta | null;
  originalname: string;
  mimetype: string | null;
};

const resolvePersianFont = (): string | null => {
  const candidates = [
    path.join(process.cwd(), "assets", "fonts", "Vazirmatn-Medium.ttf"),
    path.join(process.cwd(), "assets", "fonts", "IRANSansX-Medium.ttf"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
};

const setupFont = (doc: any) => {
  const fontPath = resolvePersianFont();
  if (fontPath) {
    doc.registerFont("fa", fontPath);
    doc.font("fa");
    enablePersianPdfText(doc);
  }
};

const CONNECTION_PAIRS: Record<number, [number, number]> = {
  1: [27, 28],
  2: [26, 27],
  3: [25, 26],
  4: [24, 25],
  5: [23, 24],
  6: [22, 23],
  7: [21, 22],
  8: [11, 21],
  9: [18, 17],
  10: [17, 16],
  11: [16, 15],
  12: [14, 15],
  13: [14, 13],
  14: [12, 13],
  15: [12, 11],
  16: [48, 47],
  17: [47, 46],
  18: [46, 45],
  19: [45, 44],
  20: [44, 43],
  21: [42, 43],
  22: [41, 42],
  23: [31, 41],
  24: [32, 31],
  25: [33, 32],
  26: [33, 34],
  27: [34, 35],
  28: [35, 36],
  29: [36, 37],
  30: [37, 38],
};

const drawFieldBox = (
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
) => {
  doc.save();
  doc.roundedRect(x, y, width, height, BOX_RADIUS).fill(BOX_BG);
  doc.restore();

  const padding = 10;
  const innerWidth = width - padding * 2;

  doc
    .fillColor(LABEL_COLOR)
    .fontSize(8)
    .text(label, x + padding, y + 8, {
      width: innerWidth,
      align: "right",
    });

  doc
    .fillColor(VALUE_COLOR)
    .fontSize(10)
    .text(value || "-", x + padding, y + 22, {
      width: innerWidth,
      align: "right",
      lineGap: 2,
    });
};

const drawSectionTitle = (
  doc: any,
  y: number,
  title: string,
) => {
  doc
    .fillColor(SECTION_COLOR)
    .fontSize(9)
    .text(title, MARGIN, y, {
      width: CONTENT_WIDTH,
      align: "right",
    });
};

const drawConnectionDots = (
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  numbers: number[],
) => {
  if (!numbers.length) return;
  const radius = 7;
  const gap = 4;
  const total = numbers.length * radius * 2 + (numbers.length - 1) * gap;
  let cx = x + (width - total) / 2 + radius;
  const cy = y + height - 12;

  numbers.forEach((number) => {
    doc.save();
    doc.circle(cx, cy, radius).fill("#17C964");
    doc.fillColor("#FFFFFF").fontSize(8).text(String(number), cx - radius, cy - 3.5, {
      width: radius * 2,
      align: "center",
      lineBreak: false,
    });
    doc.restore();
    cx += radius * 2 + gap;
  });
};

const toothBoxLines = (toothItem: OrderPdfTooth) => [
  { text: toothItem.toothnumber !== null ? String(toothItem.toothnumber) : "-", size: 11 },
  { text: `رنگ: ${toothItem.colorLabel || "-"}`, size: 8 },
  { text: toothItem.categoryName || "-", size: 7 },
  { text: `دستگاه: ${toothItem.deviceTitle || "-"}`, size: 7 },
  { text: `خدمات: ${toothItem.services || "-"}`, size: 7 },
];

const measureToothBoxHeight = (doc: any, toothItem: OrderPdfTooth, width: number) => {
  const innerWidth = width - 16;
  let height = 8;
  toothBoxLines(toothItem).forEach((line) => {
    doc.fontSize(line.size);
    height +=
      doc.heightOfString(line.text, {
        width: innerWidth,
        align: "center",
        lineGap: 1,
      }) + 2;
  });
  return Math.max(78, height + 18);
};

const drawToothBox = (
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  toothItem: OrderPdfTooth,
  connectionNumbers: number[] = [],
) => {
  doc.save();
  doc.roundedRect(x, y, width, height, BOX_RADIUS).fill(BOX_BG);
  doc.restore();

  const padding = 8;
  const innerWidth = width - padding * 2;
  let textY = y + 8;

  toothBoxLines(toothItem).forEach((line) => {
    doc
      .fillColor(VALUE_COLOR)
      .fontSize(line.size)
      .text(line.text, x + padding, textY, {
        width: innerWidth,
        align: "center",
        lineGap: 1,
      });
    textY +=
      doc.heightOfString(line.text, {
        width: innerWidth,
        align: "center",
        lineGap: 1,
      }) + 2;
  });

  drawConnectionDots(doc, x, y, width, height, connectionNumbers);
};

const LINK_COLOR = "#2563EB";

const measureDownloadableFilesHeight = (
  doc: any,
  files: DownloadableFile[],
  width: number,
): number => {
  if (!files.length) {
    return doc.heightOfString("-", { width, align: "right" });
  }

  let total = 0;
  files.forEach((file, index) => {
    if (index > 0) total += 6;
    if (file.label) {
      doc.fontSize(8);
      total += doc.heightOfString(file.label, { width, align: "right" }) + 2;
    }
    doc.fontSize(9);
    total += doc.heightOfString(file.name, { width, align: "right" }) + 2;
    if (file.comment) {
      doc.fontSize(8);
      total +=
        doc.heightOfString(`توضیحات: ${file.comment}`, {
          width,
          align: "right",
          lineGap: 2,
        }) + 4;
    }
  });
  return total;
};

const drawDownloadableFiles = (
  doc: any,
  x: number,
  y: number,
  width: number,
  files: DownloadableFile[],
) => {
  const padding = 10;
  const innerWidth = width - padding * 2;
  let currentY = y + 30;

  if (!files.length) {
    doc
      .fillColor(VALUE_COLOR)
      .fontSize(9)
      .text("-", x + padding, currentY, {
        width: innerWidth,
        align: "right",
      });
    return;
  }

  files.forEach((file, index) => {
    if (index > 0) currentY += 6;

    if (file.label) {
      doc
        .fillColor(LABEL_COLOR)
        .fontSize(8)
        .text(file.label, x + padding, currentY, {
          width: innerWidth,
          align: "right",
        });
      currentY +=
        doc.heightOfString(file.label, { width: innerWidth, align: "right" }) +
        2;
    }

    doc.fillColor(LINK_COLOR).fontSize(9);
    const linkHeight = doc.heightOfString(file.name, {
      width: innerWidth,
      align: "right",
      link: file.url,
      underline: true,
    });
    doc.text(file.name, x + padding, currentY, {
      width: innerWidth,
      align: "right",
      link: file.url,
      underline: true,
    });
    currentY += linkHeight + 2;

    if (file.comment) {
      doc
        .fillColor(VALUE_COLOR)
        .fontSize(8)
        .text(`توضیحات: ${file.comment}`, x + padding, currentY, {
          width: innerWidth,
          align: "right",
          lineGap: 2,
        });
      currentY +=
        doc.heightOfString(`توضیحات: ${file.comment}`, {
          width: innerWidth,
          align: "right",
          lineGap: 2,
        }) + 4;
    }
  });
};

const measureTextHeight = (
  doc: any,
  text: string,
  width: number,
  fontSize: number,
): number => {
  doc.fontSize(fontSize);
  return doc.heightOfString(text || "-", { width, align: "right", lineGap: 3 });
};

const drawOrderForm = (doc: any, data: OrderPdfData) => {
  setupFont(doc);
  let y = MARGIN;

  drawFieldBox(
    doc,
    MARGIN,
    y,
    CONTENT_WIDTH,
    52,
    "فیلد مخفی",
    data.hiddenField,
  );
  y += 52 + GAP + 4;

  const col4Width = (CONTENT_WIDTH - GAP * 3) / 4;
  const rowFields = [
    { label: "نوع کاربری", value: data.userType },
    { label: "نام پزشک", value: data.doctorName },
    { label: "نام بیمار", value: data.patientName },
    { label: "جنسیت", value: data.gender },
  ];

  rowFields.forEach((field, index) => {
    const rtlIndex = rowFields.length - 1 - index;
    const x = MARGIN + rtlIndex * (col4Width + GAP);
    drawFieldBox(doc, x, y, col4Width, 52, field.label, field.value);
  });
  y += 52 + GAP + 4;

  const col2Width = (CONTENT_WIDTH - GAP) / 2;
  drawFieldBox(
    doc,
    MARGIN + col2Width + GAP,
    y,
    col2Width,
    52,
    "انتخاب نوع رنگ",
    data.colorType,
  );
  drawFieldBox(
    doc,
    MARGIN,
    y,
    col2Width,
    52,
    "رنگ",
    data.shade,
  );
  y += 52 + GAP + 8;

  drawSectionTitle(doc, y, "انتخاب سفارش دندان");
  y += 16;

  const teethCols = 4;
  const toothBoxWidth = (CONTENT_WIDTH - GAP * (teethCols - 1)) / teethCols;
  let teethY = y;
  const presentTeeth = new Set(
    data.teeth
      .map((toothItem) => toothItem.toothnumber)
      .filter((toothNumber): toothNumber is number => toothNumber !== null),
  );
  const activeConnections = (data.connections ?? [])
    .map((connection) => Number(connection))
    .filter((connection) => {
      const pair = CONNECTION_PAIRS[connection];
      return !!pair && presentTeeth.has(pair[0]) && presentTeeth.has(pair[1]);
    });

  for (let index = 0; index < data.teeth.length; index += teethCols) {
    const row = data.teeth.slice(index, index + teethCols);
    const rowHeight = Math.max(
      ...row.map((toothItem) => measureToothBoxHeight(doc, toothItem, toothBoxWidth)),
    );
    if (teethY + rowHeight > doc.page.height - MARGIN) {
      doc.addPage();
      teethY = MARGIN;
    }
    row.forEach((toothItem, column) => {
      const connectionNumbers = activeConnections.filter((connection) =>
        CONNECTION_PAIRS[connection]?.includes(toothItem.toothnumber ?? -1),
      );
      drawToothBox(
        doc,
        MARGIN + column * (toothBoxWidth + GAP),
        teethY,
        toothBoxWidth,
        rowHeight,
        toothItem,
        connectionNumbers,
      );
    });
    teethY += rowHeight + GAP;
  }
  y = teethY + 8;

  const connectionText = activeConnections
    .map((connection) => {
      const pair = CONNECTION_PAIRS[connection];
      return pair ? `دندان ${pair[0]} به ${pair[1]}` : null;
    })
    .filter((line): line is string => !!line)
    .join("، ");

  if (connectionText) {
    const connectionInnerWidth = CONTENT_WIDTH - 20;
    doc.fontSize(10);
    const connectionTextHeight = doc.heightOfString(connectionText, {
      width: connectionInnerWidth,
      align: "right",
      lineGap: 2,
    });
    const connectionBoxHeight = Math.max(52, 22 + connectionTextHeight + 12);
    if (y + connectionBoxHeight > doc.page.height - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
    drawFieldBox(
      doc,
      MARGIN,
      y,
      CONTENT_WIDTH,
      connectionBoxHeight,
      "چسباندن",
      connectionText,
    );
    y += connectionBoxHeight + GAP + 8;
  }

  if (y > doc.page.height - 180) {
    doc.addPage();
    y = MARGIN;
  }

  const volumeText = data.volumes.length
    ? data.volumes.map((item) => `${item.label}: ${item.value}`).join("\n")
    : "-";
  const volumeInnerWidth = CONTENT_WIDTH - 20;
  doc.fontSize(10);
  const volumeTextHeight = doc.heightOfString(volumeText, {
    width: volumeInnerWidth,
    align: "right",
    lineGap: 2,
  });
  const volumeBoxHeight = Math.max(52, 22 + volumeTextHeight + 12);

  if (y + volumeBoxHeight > doc.page.height - MARGIN) {
    doc.addPage();
    y = MARGIN;
  }

  drawFieldBox(
    doc,
    MARGIN,
    y,
    CONTENT_WIDTH,
    volumeBoxHeight,
    "حجم‌ها",
    volumeText,
  );
  y += volumeBoxHeight + GAP + 8;

  if (y > doc.page.height - 160) {
    doc.addPage();
    y = MARGIN;
  }

  drawSectionTitle(doc, y, "بارگذاری فایل‌ها");
  y += 16;

  const fileColWidth = CONTENT_WIDTH * 0.42;
  const commentColWidth = CONTENT_WIDTH - fileColWidth - GAP;
  const boxPadding = 10;
  const fileInnerWidth = fileColWidth - boxPadding * 2;
  const commentInnerWidth = commentColWidth - boxPadding * 2;

  doc.fontSize(9);
  const filesContentHeight = measureDownloadableFilesHeight(
    doc,
    data.downloadableFiles,
    fileInnerWidth,
  );
  const commentTextHeight = measureTextHeight(
    doc,
    data.doctorComments,
    commentInnerWidth,
    9,
  );
  const bottomSectionHeight = Math.max(
    120,
    filesContentHeight + 48,
    commentTextHeight + 48,
  );

  if (y + bottomSectionHeight > doc.page.height - MARGIN) {
    doc.addPage();
    y = MARGIN;
  }

  const fileX = MARGIN + commentColWidth + GAP;
  doc.save();
  doc
    .roundedRect(fileX, y, fileColWidth, bottomSectionHeight, BOX_RADIUS)
    .fill(BOX_BG);
  doc.restore();

  doc
    .fillColor(LABEL_COLOR)
    .fontSize(8)
    .text(
      "بارگذاری فایل‌ها (و تصویر جهت تعیین رنگ)",
      fileX + boxPadding,
      y + 10,
      { width: fileInnerWidth, align: "right" },
    );

  drawDownloadableFiles(doc, fileX, y, fileColWidth, data.downloadableFiles);

  doc.save();
  doc
    .roundedRect(MARGIN, y, commentColWidth, bottomSectionHeight, BOX_RADIUS)
    .fill(BOX_BG);
  doc.restore();

  doc
    .fillColor(LABEL_COLOR)
    .fontSize(8)
    .text("توضیحات پزشک", MARGIN + boxPadding, y + 10, {
      width: commentInnerWidth,
      align: "right",
    });

  doc
    .fillColor(VALUE_COLOR)
    .fontSize(9)
    .text(data.doctorComments || "-", MARGIN + boxPadding, y + 28, {
      width: commentInnerWidth,
      align: "right",
      lineGap: 3,
    });
};

const addImageToPDF = (
  doc: any,
  filePath: string,
  meta: FileImageMeta | null,
  originalname: string,
  mimetype: string | null,
): boolean => {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return false;
  }

  const isImage =
    mimetype?.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filePath);

  if (!isImage) return false;

  try {
    doc.addPage();
    setupFont(doc);

    if (meta) {
      if (meta.section) {
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor(VALUE_COLOR).text(meta.section, { align: "center" });
      } else if (meta.toothnumber !== null && meta.toothnumber !== undefined) {
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor(VALUE_COLOR).text(
          `دندان: ${meta.toothnumber}`,
          { align: "center" },
        );
      }
      if (meta.text) {
        doc.moveDown(0.5);
        doc.fontSize(11).text(`توضیحات: ${meta.text}`, { align: "center" });
      }
    }

    doc.moveDown(1);
    doc.image(filePath, {
      fit: [500, 500],
      align: "center",
      valign: "center",
    });

    doc.moveDown();
    doc.fontSize(9).text(originalname || path.basename(filePath), {
      align: "center",
    });

    return true;
  } catch (imageError) {
    console.error(`Error adding image ${filePath}:`, imageError);
    return false;
  }
};

export const generateOrderFormPdfFile = async (
  pdfPath: string,
  formData: OrderPdfData,
  materialImages: MaterialImage[] = [],
): Promise<{ imageCount: number }> => {
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  drawOrderForm(doc, formData);

  let imageCount = 0;
  for (const image of materialImages) {
    const added = addImageToPDF(
      doc,
      image.filePath,
      image.meta,
      image.originalname,
      image.mimetype,
    );
    if (added) imageCount++;
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return { imageCount };
};

export const buildToothColorLabel = (tooth: {
  materialshadeTitle?: string | null;
}) => {
  return tooth.materialshadeTitle || "-";
};

export const getUserTypeLabel = (user: {
  role: string;
  laboratoryName?: string | null;
}) => {
  if (user.laboratoryName) return "کلینیک";
  if (user.role === "doctor") return "پزشک";
  if (user.role === "labrator") return "لابراتوار";
  if (user.role === "admin") return "مدیر";
  if (user.role === "designer") return "طراح";
  return user.role || "-";
};

export const getGenderLabel = (gender?: string | null) => {
  if (gender === "male") return "آقا";
  if (gender === "female") return "خانم";
  return "-";
};

export const buildFileDownloadUrl = (baseUrl: string, filePath: string) => {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  const cleanPath = normalized.startsWith("/")
    ? normalized.slice(1)
    : normalized;
  return `${baseUrl.replace(/\/$/, "")}/${cleanPath}?download=1`;
};
