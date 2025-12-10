import { Request, Response } from "express";
import { db } from "../../../db";
import { errorResponse, successResponse } from "../../../utils/responses";
import { ticketMessages, tickets } from "../../../db/schema/ticket";
import { eq } from "drizzle-orm";
import { orders } from "../../../db/schema/orders";
import { files } from "../../../db/schema/files";

export const getTickets = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const list = await db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, user.userId));

    return successResponse(res, 200, list, "Tickets fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const getTicketByOrderId = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);

    const ticketInfo = await db
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, orderId));

    if (!ticketInfo.length)
      return errorResponse(res, 404, "Ticket not found", null);

    const messages = await db
      .select({
        id: ticketMessages.id,
        senderId: ticketMessages.senderId,
        senderType: ticketMessages.senderType,
        message: ticketMessages.message,
        createdAt: ticketMessages.createdAt,
        file: ticketMessages.file,
      })
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketInfo[0].id));

    return successResponse(
      res,
      200,
      {
        ...ticketInfo[0],
        messages,
      },
      "Ticket fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const createTicket = async (req: Request, res: Response) => {
  try {
    const { orderId,  subject, message } = req.body;
    const user = (req as any).user;
    const file = req.file;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, +orderId));

    if (!order) {
      return errorResponse(res, 404, "This order is not found", null);
    }
    if (order.report) {
      return errorResponse(res, 404, "This order has report", null);
    }
    if (order.user_id !== user.userId)
      return errorResponse(
        res,
        403,
        "You are not authorized to create ticket this order",
        null
      );
    const [newTicket] = await db
      .insert(tickets)
      .values({
        orderId,
        userId : user.userId,
        subject,
        ticketStatus: "open",
      })
      .returning();
    await db
      .update(orders)
      .set({ report: newTicket.id })
      .where(eq(orders.id, +orderId));

    if (file) {
      const fileRecord = await db
        .insert(files)
        .values({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          user_id: (req as any).user?.id || null,
        })
        .returning();
    }
    const msg = await db
      .insert(ticketMessages)
      .values({
        ticketId: newTicket.id,
        senderId: user.userId,
        senderType: user.role === "admin" ? "admin" : "user",
        message,
        file: file?.path,
      })
      .returning();

    return successResponse(
      res,
      200,
      {
        ...newTicket,
        message: msg,
      },
      "Ticket created successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { subject, status } = req.body;

    const data: any = {};
    if (subject) data.subject = subject;
    if (status) data.status = status;

    const updated = await db
      .update(tickets)
      .set(data)
      .where(eq(tickets.id, Number(req.params.id)))
      .returning();

    return successResponse(res, 200, updated[0], "Ticket updated successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const deleteTicket = async (req: Request, res: Response) => {
  try {
    await db.delete(tickets).where(eq(tickets.id, Number(req.params.id)));

    return successResponse(res, 200, null, "Ticket deleted successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const createTicketMessage = async (req: Request, res: Response) => {
  try {
    const { ticketId, message } = req.body;
    const user = (req as any).user;
    const file = req.file;
    if (file) {
      const fileRecord = await db
        .insert(files)
        .values({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          user_id: (req as any).user?.id || null,
        })
        .returning();
    }
    
    const msg = await db
      .insert(ticketMessages)
      .values({
        ticketId,
        senderId: user.userId,
        senderType: user.role === "admin" ? "admin" : "user",
        message,
        file: file?.path,
      })
      .returning();

    return successResponse(res, 200, msg[0], "Message sent successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const deleteTicketMessage = async (req: Request, res: Response) => {
  try {
    const messageId = Number(req.params.id);

    await db.delete(ticketMessages).where(eq(ticketMessages.id, messageId));

    return successResponse(res, 200, null, "Message deleted successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
