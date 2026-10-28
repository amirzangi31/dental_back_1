import fs from "fs";
import path from "path";
import { INVOICE_COPY_LABELS, InvoiceDocument } from "../modules/v1/invoice/invoiceDocument";
import { renderInvoicePdf } from "../modules/v1/invoice/invoicePdf";

const sample: InvoiceDocument = {
  id: 1,
  orderId: 42,
  paymentId: 7,
  issuedAt: "2026-10-27T16:40:00.000Z",
  buyer: {
    name: "لابراتوار دندان‌سازی نیک",
    phone: "09121234567",
    address: "تهران، ونک، خیابان خدامی، پلاک ۱۲، طبقه دوم",
    postalCode: "1991912345",
    economicNumber: null,
    nationalId: null,
    city: null,
  },
  seller: {
    name: "شرکت دندان‌سازی نمونه",
    phone: "02188776655",
    address: "تهران، سعادت‌آباد، سرو غربی، پلاک ۸",
    postalCode: "1997991234",
    economicNumber: "411234567890",
    nationalId: "10101234567",
    registrationNumber: "456789",
    city: "تهران",
  },
  taxNumber: null,
  taxPercent: 10,
  paidToman: 169400,
  totalRial: 1694000,
  discountRial: 0,
  tollRial: 0,
  taxRial: 154000,
  cashRial: 1694000,
  nonCashRial: null,
  trackingCode: "123456789012",
  notes: "روکش و لمینت بیمار مریم احمدی\nکد پیگیری: 123456789012",
  lines: [
    {
      rowNumber: 1,
      productCode: null,
      description: "روکش زیرکونیا، دندان ۱۱، بیمار مریم احمدی",
      quantity: 1,
      unitAmountRial: 1000000,
      lineTotalRial: 1000000,
      discountRial: 0,
      amountAfterDiscountRial: 1000000,
      taxRial: 100000,
      tollRial: 0,
      taxAndTollRial: 100000,
      totalWithTaxRial: 1100000,
    },
    {
      rowNumber: 2,
      productCode: null,
      description: "لمینت، دندان ۲۱، بیمار مریم احمدی",
      quantity: 1,
      unitAmountRial: 400000,
      lineTotalRial: 400000,
      discountRial: 0,
      amountAfterDiscountRial: 400000,
      taxRial: 40000,
      tollRial: 0,
      taxAndTollRial: 40000,
      totalWithTaxRial: 440000,
    },
    {
      rowNumber: 3,
      productCode: null,
      description: "خدمات ویژه",
      quantity: 1,
      unitAmountRial: 140000,
      lineTotalRial: 140000,
      discountRial: 0,
      amountAfterDiscountRial: 140000,
      taxRial: 14000,
      tollRial: 0,
      taxAndTollRial: 14000,
      totalWithTaxRial: 154000,
    },
  ],
  copies: INVOICE_COPY_LABELS,
  stamp: null,
  signature: null,
};

const out = path.join(process.cwd(), "docs", "sample-invoice.pdf");

renderInvoicePdf(sample).then((pdf) => {
  fs.writeFileSync(out, pdf);
  console.log(out);
});
