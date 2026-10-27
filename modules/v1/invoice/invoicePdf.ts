import fs from "fs";
import path from "path";
import { InvoiceDocument, InvoiceParty, InvoiceSeller } from "./invoiceDocument";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 24;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = PAGE_HEIGHT - MARGIN;

const resolvePersianFont = (): string | null => {
  const candidates = [
    path.join(process.cwd(), "assets", "fonts", "Vazirmatn-Medium.ttf"),
    path.join(process.cwd(), "assets", "fonts", "IRANSansX-Medium.ttf"),
  ];
  return candidates.find((fontPath) => fs.existsSync(fontPath)) ?? null;
};

const setupFont = (doc: any) => {
  const fontPath = resolvePersianFont();
  if (!fontPath) return;
  if (!doc._invoiceFontReady) {
    doc.registerFont("fa", fontPath);
    doc._invoiceFontReady = true;
  }
  doc.font("fa");
};

const formatRial = (value: number | null) => {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("fa-IR").format(value);
};

const formatPercent = (value: number) =>
  `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value)}٪`;

const formatIssuedAt = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const text = (value: string | null | undefined) => value?.trim() ?? "";

type Column = { title: string; width: number; x: number; key: string };

const tableColumns = (): Column[] => {
  const specs = [
    { key: "row", title: "ردیف", width: 32 },
    { key: "code", title: "کد کالا", width: 52 },
    { key: "description", title: "شرح", width: 168 },
    { key: "qty", title: "عدد", width: 32 },
    { key: "unit", title: "مبلغ واحد", width: 68 },
    { key: "line", title: "مبلغ کل", width: 68 },
    { key: "discount", title: "تخفیف", width: 52 },
    { key: "after", title: "بعد از تخفیف", width: 72 },
    { key: "tax", title: "مالیات", width: 60 },
    { key: "toll", title: "عوارض", width: 48 },
    { key: "taxToll", title: "مالیات و عوارض", width: 78 },
    { key: "total", title: "جمع با مالیات", width: 74 },
  ];
  const used = specs.reduce((sum, column) => sum + column.width, 0);
  specs[2].width += CONTENT_WIDTH - used;
  let cursor = MARGIN + CONTENT_WIDTH;
  return specs.map((column) => {
    cursor -= column.width;
    return { ...column, x: cursor };
  });
};

const ensureSpace = (doc: any, y: number, needed: number) => {
  if (y + needed <= BOTTOM) return y;
  doc.addPage();
  setupFont(doc);
  return MARGIN;
};

const drawSectionTitle = (doc: any, y: number, title: string) => {
  doc.fillColor("#444444").fontSize(10).text(title, MARGIN, y, {
    width: CONTENT_WIDTH,
    height: 14,
    align: "right",
    lineBreak: false,
  });
  return y + 16;
};

const drawFields = (
  doc: any,
  y: number,
  fields: { label: string; value: string | null }[],
) => {
  const columns = 4;
  const gap = 6;
  const boxWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
  const height = 36;
  const regular = fields.filter((field) => field.label !== "آدرس");
  regular.forEach((field, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const visualColumn = columns - 1 - column;
    const x = MARGIN + visualColumn * (boxWidth + gap);
    const fieldY = y + row * (height + gap);
    doc.save();
    doc.roundedRect(x, fieldY, boxWidth, height, 4).fill("#F4F4F4");
    doc.restore();
    doc.fillColor("#888888").fontSize(7).text(field.label, x + 6, fieldY + 5, {
      width: boxWidth - 12,
      height: 10,
      align: "right",
      lineBreak: false,
    });
    doc.fillColor("#222222").fontSize(9).text(text(field.value), x + 6, fieldY + 18, {
      width: boxWidth - 12,
      height: 14,
      align: "right",
      lineBreak: false,
    });
  });
  const rows = Math.ceil(regular.length / columns) || 0;
  let nextY = y + rows * (height + gap);
  const address = fields.find((field) => field.label === "آدرس");
  if (!address) return nextY;

  const addressHeight = 36;
  doc.save();
  doc.roundedRect(MARGIN, nextY, CONTENT_WIDTH, addressHeight, 4).fill("#F4F4F4");
  doc.restore();
  doc.fillColor("#888888").fontSize(7).text(address.label, MARGIN + 6, nextY + 5, {
    width: CONTENT_WIDTH - 12,
    height: 10,
    align: "right",
    lineBreak: false,
  });
  doc.fillColor("#222222").fontSize(9).text(text(address.value), MARGIN + 6, nextY + 18, {
    width: CONTENT_WIDTH - 12,
    height: 14,
    align: "right",
    lineBreak: false,
  });
  return nextY + addressHeight + gap;
};

const partyFields = (party: InvoiceParty | InvoiceSeller) => {
  const fields = [
    { label: "نام", value: party.name },
    { label: "شماره اقتصادی", value: party.economicNumber },
    { label: "شناسه ملی", value: party.nationalId },
  ];
  if ("registrationNumber" in party) {
    fields.push({ label: "شماره ثبت", value: party.registrationNumber });
  }
  fields.push(
    { label: "شهر", value: party.city },
    { label: "کدپستی", value: party.postalCode },
    { label: "تلفن", value: party.phone },
    { label: "آدرس", value: party.address },
  );
  return fields;
};

const drawTableHeader = (doc: any, y: number, columns: Column[]) => {
  doc.save();
  doc.rect(MARGIN, y, CONTENT_WIDTH, 28).fill("#E6E6E6");
  doc.restore();
  columns.forEach((column) => {
    doc.fillColor("#333333").fontSize(7).text(column.title, column.x + 2, y + 8, {
      width: column.width - 4,
      height: 16,
      align: "center",
    });
  });
  return y + 28;
};

const lineCells = (line: InvoiceDocument["lines"][number]) => ({
  row: formatRial(line.rowNumber),
  code: text(line.productCode),
  description: line.description,
  qty: formatRial(line.quantity),
  unit: formatRial(line.unitAmountRial),
  line: formatRial(line.lineTotalRial),
  discount: formatRial(line.discountRial),
  after: formatRial(line.amountAfterDiscountRial),
  tax: formatRial(line.taxRial),
  toll: formatRial(line.tollRial),
  taxToll: formatRial(line.taxAndTollRial),
  total: formatRial(line.totalWithTaxRial),
});

const drawInvoice = (doc: any, data: InvoiceDocument) => {
  setupFont(doc);
  let y = MARGIN;
  const columns = tableColumns();

  doc.fillColor("#222222").fontSize(16).text("فاکتور فروش", MARGIN, y, {
    width: CONTENT_WIDTH,
    height: 20,
    align: "center",
    lineBreak: false,
  });
  y += 24;
  doc.fontSize(9).text(`تاریخ: ${formatIssuedAt(data.issuedAt)}`, MARGIN, y, {
    width: CONTENT_WIDTH,
    height: 12,
    align: "right",
    lineBreak: false,
  });
  y += 14;
  doc.text("مبالغ به ریال", MARGIN, y, {
    width: CONTENT_WIDTH,
    height: 12,
    align: "right",
    lineBreak: false,
  });
  y += 14;
  doc.text(`شماره مالیاتی: ${text(data.taxNumber)}`, MARGIN, y, {
    width: CONTENT_WIDTH,
    height: 12,
    align: "right",
    lineBreak: false,
  });
  y += 20;

  y = drawSectionTitle(doc, y, "مشخصات فروشنده");
  y = drawFields(doc, y, partyFields(data.seller));
  y += 6;
  y = drawSectionTitle(doc, y, "مشخصات خریدار");
  y = drawFields(doc, y, partyFields(data.buyer));
  y += 8;

  y = ensureSpace(doc, y, 48);
  y = drawSectionTitle(doc, y, "کالا یا خدمت");
  y = drawTableHeader(doc, y, columns);

  data.lines.forEach((line) => {
    const cells = lineCells(line);
    const descriptionColumn = columns.find((column) => column.key === "description")!;
    doc.fontSize(8);
    const descriptionHeight = doc.heightOfString(cells.description || " ", {
      width: descriptionColumn.width - 6,
      align: "right",
    });
    const rowHeight = Math.max(22, descriptionHeight + 8);
    const continued = ensureSpace(doc, y, rowHeight);
    if (continued !== y) y = drawTableHeader(doc, continued, columns);
    else y = continued;
    doc.save();
    doc.strokeColor("#DDDDDD").rect(MARGIN, y, CONTENT_WIDTH, rowHeight).stroke();
    doc.restore();
    columns.forEach((column) => {
      const value = cells[column.key as keyof typeof cells];
      doc.fillColor("#222222").fontSize(8).text(value, column.x + 3, y + 6, {
        width: column.width - 6,
        height: rowHeight - 8,
        align: column.key === "description" ? "right" : "center",
      });
    });
    y += rowHeight;
  });

  y = ensureSpace(doc, y, 36);
  doc.fontSize(8).fillColor("#222222").text(
    `جمع تخفیف: ${formatRial(data.discountRial)}    مالیات (${formatPercent(data.taxPercent)}): ${formatRial(data.taxRial)}    عوارض: ${formatRial(data.tollRial)}    جمع کل: ${formatRial(data.totalRial)}`,
    MARGIN,
    y + 8,
    { width: CONTENT_WIDTH, height: 16, align: "right", lineBreak: false },
  );
  y += 28;

  y = ensureSpace(doc, y, 70);
  y = drawSectionTitle(doc, y, "نحوه فروش");
  y = drawFields(doc, y, [
    { label: "نقدی", value: formatRial(data.cashRial) },
    { label: "غیرنقدی", value: formatRial(data.nonCashRial) },
  ]);
  y += 6;

  y = ensureSpace(doc, y, 70);
  y = drawSectionTitle(doc, y, "توضیحات");
  const notes = text(data.notes);
  doc.fontSize(9);
  const notesHeight = Math.max(36, doc.heightOfString(notes || " ", { width: CONTENT_WIDTH - 16 }) + 12);
  doc.save();
  doc.strokeColor("#CCCCCC").roundedRect(MARGIN, y, CONTENT_WIDTH, notesHeight, 4).stroke();
  doc.restore();
  doc.fillColor("#222222").text(notes, MARGIN + 8, y + 6, {
    width: CONTENT_WIDTH - 16,
    height: notesHeight - 10,
    align: "right",
  });
  y += notesHeight + 12;

  y = ensureSpace(doc, y, 78);
  const boxWidth = (CONTENT_WIDTH - 12) / 2;
  ["مهر", "امضا"].forEach((label, index) => {
    const x = MARGIN + (1 - index) * (boxWidth + 12);
    doc.save();
    doc.strokeColor("#CCCCCC").roundedRect(x, y, boxWidth, 64, 4).stroke();
    doc.restore();
    doc.fillColor("#888888").fontSize(9).text(label, x + 8, y + 8, {
      width: boxWidth - 16,
      height: 14,
      align: "right",
      lineBreak: false,
    });
  });
  y += 76;

  y = ensureSpace(doc, y, 28);
  const copyWidth = (CONTENT_WIDTH - 16) / data.copies.length;
  data.copies.forEach((label, index) => {
    const visualIndex = data.copies.length - 1 - index;
    const x = MARGIN + visualIndex * (copyWidth + 8);
    doc.save();
    doc.strokeColor("#CCCCCC").roundedRect(x, y, copyWidth, 22, 4).stroke();
    doc.restore();
    doc.fillColor("#222222").fontSize(9).text(`نسخه ${label}`, x + 4, y + 6, {
      width: copyWidth - 8,
      height: 14,
      align: "center",
      lineBreak: false,
    });
  });
};

export const renderInvoicePdf = (data: InvoiceDocument): Promise<Buffer> => {
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ margin: MARGIN, size: "A4", layout: "landscape" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  drawInvoice(doc, data);
  doc.end();
  return done;
};
