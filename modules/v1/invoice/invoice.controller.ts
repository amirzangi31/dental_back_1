import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { orders } from "../../../db/schema/orders";
import { errorResponse, successResponse } from "../../../utils/responses";
import { readInvoiceByOrderId } from "./readInvoice";
import { renderInvoicePdf } from "./invoicePdf";
import { InvoiceDocument } from "./invoiceDocument";

type AuthorizedInvoice =
  | { ok: true; document: InvoiceDocument }
  | { ok: false; status: 403 | 404; message: string };

const loadAuthorizedInvoice = async (req: Request): Promise<AuthorizedInvoice> => {
  const orderId = Number(req.params.orderId ?? req.params.id);
  const user = (req as any).user;
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return { ok: false, status: 404, message: "Order not found" };
  }

  const [order] = await db
    .select({ id: orders.id, userId: orders.user_id })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order) return { ok: false, status: 404, message: "Order not found" };
  if (order.userId !== user.userId && user.role !== "admin") {
    return {
      ok: false,
      status: 403,
      message: "You are not authorized to access this order",
    };
  }

  const document = await readInvoiceByOrderId(orderId);
  if (!document) return { ok: false, status: 404, message: "Invoice not found" };
  return { ok: true, document };
};

export const getOrderInvoice = async (req: Request, res: Response) => {
  try {
    const result = await loadAuthorizedInvoice(req);
    if (!result.ok) {
      return errorResponse(res, result.status, result.message, null);
    }
    return successResponse(res, 200, result.document, "Invoice fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const downloadOrderInvoice = async (req: Request, res: Response) => {
  try {
    const result = await loadAuthorizedInvoice(req);
    if (!result.ok) {
      return errorResponse(res, result.status, result.message, null);
    }

    const pdf = await renderInvoicePdf(result.document);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${result.document.orderId}.pdf"`,
    );
    return res.status(200).send(pdf);
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
