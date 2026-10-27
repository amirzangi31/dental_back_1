import { asc, eq } from "drizzle-orm";
import { db } from "../../../db";
import { invoice, invoiceLine } from "../../../db/schema/invoice";
import { InvoiceDocument, toInvoiceDocument } from "./invoiceDocument";

export const readInvoiceByOrderId = async (
  orderId: number,
  executor: any = db,
): Promise<InvoiceDocument | null> => {
  const [row] = await executor
    .select()
    .from(invoice)
    .where(eq(invoice.orderId, orderId));
  if (!row) return null;

  const lines = await executor
    .select()
    .from(invoiceLine)
    .where(eq(invoiceLine.invoiceId, row.id))
    .orderBy(asc(invoiceLine.rowNumber));

  return toInvoiceDocument(row, lines);
};
