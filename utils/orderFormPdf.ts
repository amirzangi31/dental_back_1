import path from "path";
import fs from "fs";

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

export type OrderPdfData = {
  hiddenField: string;
  userType: string;
  doctorName: string;
  patientName: string;
  gender: string;
  colorType: string;
  colorSystem: string;
  shade: string;
  teeth: {
    toothnumber: number | null;
    categoryName: string;
    colorLabel: string;
  }[];
  otherServices: string;
  downloadableFiles: DownloadableFile[];
  doctorComments: string;
};

type MaterialImage = {
  filePath: string;
  meta: { toothnumber: number | null; text: string | null } | null;
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
  }
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

const drawToothBox = (
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  toothnumber: number | null,
  colorLabel: string,
  categoryName: string,
) => {
  doc.save();
  doc.roundedRect(x, y, width, height, BOX_RADIUS).fill(BOX_BG);
  doc.restore();

  const padding = 8;
  const innerWidth = width - padding * 2;

  doc
    .fillColor(VALUE_COLOR)
    .fontSize(11)
    .text(toothnumber !== null ? String(toothnumber) : "-", x + padding, y + 8, {
      width: innerWidth,
      align: "center",
    });

  doc
    .fillColor(VALUE_COLOR)
    .fontSize(8)
    .text(colorLabel || "-", x + padding, y + 22, {
      width: innerWidth,
      align: "center",
      lineGap: 1,
    });

  doc
    .fillColor(VALUE_COLOR)
    .fontSize(7)
    .text(categoryName || "-", x + padding, y + 36, {
      width: innerWidth,
      align: "center",
      lineGap: 1,
    });
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
    data.colorSystem || "VITA Classic",
    data.shade,
  );
  y += 52 + GAP + 8;

  drawSectionTitle(doc, y, "انتخاب سفارش دندان");
  y += 16;

  const teethCols = 4;
  const toothBoxWidth = (CONTENT_WIDTH - GAP * (teethCols - 1)) / teethCols;
  const toothBoxHeight = 62;
  let teethY = y;
  let teethCol = 0;

  data.teeth.forEach((toothItem) => {
    if (
      teethCol === 0 &&
      teethY + toothBoxHeight > doc.page.height - MARGIN
    ) {
      doc.addPage();
      teethY = MARGIN;
    }

    const boxX = MARGIN + teethCol * (toothBoxWidth + GAP);
    drawToothBox(
      doc,
      boxX,
      teethY,
      toothBoxWidth,
      toothBoxHeight,
      toothItem.toothnumber,
      toothItem.colorLabel,
      toothItem.categoryName,
    );

    teethCol += 1;
    if (teethCol >= teethCols) {
      teethCol = 0;
      teethY += toothBoxHeight + GAP;
    }
  });

  if (teethCol > 0) {
    teethY += toothBoxHeight + GAP;
  }
  y = teethY + 8;

  if (y > doc.page.height - 180) {
    doc.addPage();
    y = MARGIN;
  }

  drawSectionTitle(doc, y, "سایر خدمات");
  y += 16;
  drawFieldBox(
    doc,
    MARGIN,
    y,
    CONTENT_WIDTH,
    48,
    "انتخاب نوع خدمت",
    data.otherServices,
  );
  y += 48 + GAP + 8;

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
  meta: { toothnumber: number | null; text: string | null } | null,
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
      if (meta.toothnumber !== null && meta.toothnumber !== undefined) {
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
  return `${baseUrl.replace(/\/$/, "")}/${cleanPath}`;
};
