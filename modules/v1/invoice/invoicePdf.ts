import fs from "fs";
import path from "path";
import { InvoiceDocument, InvoiceParty, InvoiceSeller } from "./invoiceDocument";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = PAGE_HEIGHT - MARGIN;
const RIGHT = MARGIN + CONTENT_WIDTH;

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

const latinNumber = new Intl.NumberFormat("fa-IR-u-nu-latn");

const formatRial = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "";
  return latinNumber.format(value);
};

const formatIssuedAt = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(new Date(iso));

const text = (value: string | null | undefined) => value?.trim() ?? "";

type Align = "right" | "center" | "left";

const strokeCell = (doc: any, x: number, y: number, width: number, height: number) => {
  doc.save();
  doc.lineWidth(0.7).strokeColor("#000000").rect(x, y, width, height).stroke();
  doc.restore();
};

const writeInCell = (
  doc: any,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  align: Align,
  fontSize: number,
) => {
  doc.fillColor("#000000").fontSize(fontSize).text(value, x + 3, y + 4, {
    width: width - 6,
    height: height - 6,
    align,
    lineBreak: align === "right" && value.includes("\n"),
  });
};

const drawCells = (
  doc: any,
  y: number,
  height: number,
  cells: { text: string; width: number; align?: Align; fontSize?: number }[],
) => {
  let x = RIGHT;
  cells.forEach((cell) => {
    x -= cell.width;
    strokeCell(doc, x, y, cell.width, height);
    writeInCell(
      doc,
      cell.text,
      x,
      y,
      cell.width,
      height,
      cell.align ?? "right",
      cell.fontSize ?? 7.5,
    );
  });
  return y + height;
};

const drawBand = (
  doc: any,
  y: number,
  height: number,
  value: string,
  align: Align = "center",
  fontSize = 8,
) => drawCells(doc, y, height, [{ text: value, width: CONTENT_WIDTH, align, fontSize }]);

const sellerRows = (party: InvoiceSeller) => [
  [
    { text: "نام شخص حقیقی/حقوقی", width: 108 },
    { text: text(party.name), width: 250 },
    { text: "شماره اقتصادی", width: 78 },
    { text: text(party.economicNumber), width: 145 },
    { text: "شماره ثبت", width: 58 },
    { text: text(party.registrationNumber), width: CONTENT_WIDTH - 639 },
  ],
  [
    { text: "نشانی", width: 42 },
    { text: text(party.address), width: 268 },
    { text: "شناسه ملی", width: 58 },
    { text: text(party.nationalId), width: 100 },
    { text: "شهر", width: 32 },
    { text: text(party.city), width: 70 },
    { text: "کدپستی", width: 46 },
    { text: text(party.postalCode), width: 78 },
    { text: "شماره تلفن", width: 52 },
    { text: text(party.phone), width: CONTENT_WIDTH - 746 },
  ],
];

const buyerRows = (party: InvoiceParty) => [
  [
    { text: "نام شخص حقیقی/حقوقی", width: 108 },
    { text: text(party.name), width: 250 },
    { text: "شماره اقتصادی", width: 78 },
    { text: text(party.economicNumber), width: 145 },
    { text: "شماره ثبت", width: 58 },
    { text: "", width: CONTENT_WIDTH - 639 },
  ],
  [
    { text: "نشانی", width: 42 },
    { text: text(party.address), width: 268 },
    { text: "شناسه ملی", width: 58 },
    { text: text(party.nationalId), width: 100 },
    { text: "شهر", width: 32 },
    { text: text(party.city), width: 70 },
    { text: "کدپستی", width: 46 },
    { text: text(party.postalCode), width: 78 },
    { text: "شماره تلفن", width: 52 },
    { text: text(party.phone), width: CONTENT_WIDTH - 746 },
  ],
];

const GOODS_WIDTHS = (() => {
  const fixed = [28, 48, 32, 62, 64, 52, 72, 52, 44, 70, 112];
  const description = CONTENT_WIDTH - fixed.reduce((sum, width) => sum + width, 0);
  return [
    fixed[0],
    fixed[1],
    description,
    ...fixed.slice(2),
  ];
})();

const GOODS_HEADERS = [
  "ردیف",
  "کد کالا",
  "شرح کالا یا خدمات",
  "عدد",
  "مبلغ واحد (ریال)",
  "مبلغ کل (ریال)",
  "مبلغ تخفیف",
  "مبلغ کل پس از تخفیف",
  "مالیات",
  "عوارض",
  "جمع مالیات و عوارض",
  "جمع مبلغ کل بعلاوه جمع مالیات و عوارض",
];

const drawGoodsHeader = (doc: any, y: number) =>
  drawCells(
    doc,
    y,
    32,
    GOODS_HEADERS.map((title, index) => ({
      text: title,
      width: GOODS_WIDTHS[index],
      align: "center" as Align,
      fontSize: 6.5,
    })),
  );

const lineValues = (line: InvoiceDocument["lines"][number]) => [
  formatRial(line.rowNumber),
  text(line.productCode),
  line.description,
  formatRial(line.quantity),
  formatRial(line.unitAmountRial),
  formatRial(line.lineTotalRial),
  formatRial(line.discountRial),
  formatRial(line.amountAfterDiscountRial),
  formatRial(line.taxRial),
  formatRial(line.tollRial),
  formatRial(line.taxAndTollRial),
  formatRial(line.totalWithTaxRial),
];

const ensureSpace = (doc: any, y: number, needed: number) => {
  if (y + needed <= BOTTOM) return { y, broke: false };
  doc.addPage();
  setupFont(doc);
  return { y: MARGIN, broke: true };
};

const drawParty = (doc: any, y: number, title: string, rows: ReturnType<typeof sellerRows>) => {
  let cursor = drawBand(doc, y, 16, title);
  rows.forEach((row) => {
    cursor = drawCells(doc, cursor, 18, row);
  });
  return cursor;
};

const drawCopies = (doc: any, y: number) => {
  const labels = ["نسخه فروشنده", "نسخه خریدار", "نسخه حسابداری", "نسخه انبارداری"];
  const width = CONTENT_WIDTH / labels.length;
  const height = 20;
  labels.forEach((label, index) => {
    const x = RIGHT - (index + 1) * width;
    strokeCell(doc, x, y, width, height);
    const box = 8;
    const boxX = x + width - 16;
    const boxY = y + (height - box) / 2;
    doc.save();
    doc.lineWidth(0.7).strokeColor("#000000").rect(boxX, boxY, box, box).stroke();
    doc.restore();
    doc.fillColor("#000000").fontSize(8).text(label, x + 4, y + 5, {
      width: width - 24,
      height: 12,
      align: "right",
      lineBreak: false,
    });
  });
  return y + height;
};

const drawInvoice = (doc: any, data: InvoiceDocument) => {
  setupFont(doc);
  let y = MARGIN;

  y = drawBand(doc, y, 16, `تاریخ: ${formatIssuedAt(data.issuedAt)}`, "right", 8);
  y = drawParty(doc, y, "مشخصات فروشنده", sellerRows(data.seller));
  y = drawCells(doc, y, 18, [
    { text: "شماره مالیاتی", width: 78 },
    { text: text(data.taxNumber), width: CONTENT_WIDTH - 78 },
  ]);
  y = drawParty(doc, y, "مشخصات خریدار", buyerRows(data.buyer));
  y = drawBand(doc, y, 16, "مشخصات کالا یا خدمات مورد معامله");

  const headerSpace = ensureSpace(doc, y, 50);
  y = headerSpace.y;
  y = drawGoodsHeader(doc, y);

  data.lines.forEach((line) => {
    const values = lineValues(line);
    doc.fontSize(7);
    const descriptionHeight = doc.heightOfString(values[2] || " ", {
      width: GOODS_WIDTHS[2] - 6,
      align: "right",
    });
    const rowHeight = Math.max(18, descriptionHeight + 8);
    const room = ensureSpace(doc, y, rowHeight);
    if (room.broke) y = drawGoodsHeader(doc, room.y);
    else y = room.y;
    y = drawCells(
      doc,
      y,
      rowHeight,
      values.map((value, index) => ({
        text: value,
        width: GOODS_WIDTHS[index],
        align: (index === 2 ? "right" : "center") as Align,
        fontSize: 7,
      })),
    );
  });

  const lineTotal = data.lines.reduce((sum, line) => sum + line.lineTotalRial, 0);
  const afterDiscount = data.lines.reduce((sum, line) => sum + line.amountAfterDiscountRial, 0);
  const taxAndToll = data.taxRial + data.tollRial;
  const totalValues = [
    "",
    "",
    "",
    "",
    "",
    formatRial(lineTotal),
    formatRial(data.discountRial),
    formatRial(afterDiscount),
    formatRial(data.taxRial),
    formatRial(data.tollRial),
    formatRial(taxAndToll),
    formatRial(data.totalRial),
  ];
  const totalsRoom = ensureSpace(doc, y, 18);
  if (totalsRoom.broke) y = drawGoodsHeader(doc, totalsRoom.y);
  else y = totalsRoom.y;
  y = drawCells(
    doc,
    y,
    18,
    totalValues.map((value, index) => ({
      text: value,
      width: GOODS_WIDTHS[index],
      align: "center" as Align,
    })),
  );

  const footerNeeded = 18 + 36 + 52 + 20;
  const footerRoom = ensureSpace(doc, y, footerNeeded);
  y = footerRoom.y;

  const cashWidth = 90;
  const cashLabel = 46;
  const methodLabel = 100;
  y = drawCells(doc, y, 18, [
    { text: "شرایط و نحوه فروش", width: methodLabel },
    { text: "نقدی", width: cashLabel, align: "center" },
    { text: formatRial(data.cashRial), width: cashWidth, align: "center" },
    { text: "غیر نقدی", width: cashLabel, align: "center" },
    { text: formatRial(data.nonCashRial), width: cashWidth, align: "center" },
    {
      text: "",
      width: CONTENT_WIDTH - methodLabel - cashLabel * 2 - cashWidth * 2,
    },
  ]);

  const notes = text(data.notes);
  doc.fontSize(7.5);
  const notesHeight = Math.max(32, doc.heightOfString(notes || " ", { width: CONTENT_WIDTH - 78 }) + 8);
  y = drawCells(doc, y, notesHeight, [
    { text: "توضیحات", width: 58 },
    { text: notes, width: CONTENT_WIDTH - 58, fontSize: 7.5 },
  ]);

  const stampHeight = 52;
  strokeCell(doc, MARGIN, y, CONTENT_WIDTH, stampHeight);
  doc.fillColor("#000000").fontSize(8).text("مهر و امضاء فروشنده", MARGIN + 4, y + 4, {
    width: CONTENT_WIDTH - 8,
    height: 14,
    align: "right",
    lineBreak: false,
  });
  y += stampHeight;

  drawCopies(doc, y);
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
