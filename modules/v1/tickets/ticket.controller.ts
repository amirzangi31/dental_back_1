import { Request, Response } from "express";
import { db } from "../../../db";
import { errorResponse, successResponse } from "../../../utils/responses";
import { ticketMessages, tickets } from "../../../db/schema/ticket";
import { asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { orders } from "../../../db/schema/orders";
import { files } from "../../../db/schema/files";
import { getPagination } from "../../../utils/pagination";

export const getTickets = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const { limit, offset, sort } = getPagination(req);

    const orderByClause =
      sort === "asc" ? asc(tickets.createdAt) : desc(tickets.createdAt);

    // گرفتن تیکت‌ها
    const ticketsList = await db
      .select({
        id: tickets.id,
        orderId: tickets.orderId,
        subject: tickets.subject,
        ticketStatus: tickets.ticketStatus,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        order: {
          id: orders.id,
          status: orders.status,
        },
      })
      .from(tickets)
      .leftJoin(orders, eq(tickets.orderId, orders.id))
      .where(eq(tickets.userId, user.userId))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // گرفتن آخرین پیام برای هر تیکت
    const ticketIds = ticketsList.map((t) => t.id);

    // گرفتن همه پیام‌های مربوط به این تیکت‌ها و سپس فیلتر کردن آخرین پیام هر تیکت
    const allMessages =
      ticketIds.length > 0
        ? await db
            .select({
              ticketId: ticketMessages.ticketId,
              message: ticketMessages.message,
              createdAt: ticketMessages.createdAt,
              senderType: ticketMessages.senderType,
              senderId: ticketMessages.senderId,
              file: ticketMessages.file,
            })
            .from(ticketMessages)
            .where(inArray(ticketMessages.ticketId, ticketIds))
            .orderBy(desc(ticketMessages.createdAt))
        : [];

    // گروه‌بندی پیام‌ها بر اساس ticketId و گرفتن اولین (آخرین) پیام هر تیکت
    const lastMessageMap = new Map<number, (typeof allMessages)[0]>();
    for (const msg of allMessages) {
      if (!lastMessageMap.has(msg.ticketId)) {
        lastMessageMap.set(msg.ticketId, msg);
      }
    }

    // ترکیب تیکت‌ها با آخرین پیام
    const list = ticketsList.map((ticket) => {
      const lastMsg = lastMessageMap.get(ticket.id);
      return {
        ...ticket,
        lastMessage: lastMsg
          ? {
              message: lastMsg.message,
              createdAt: lastMsg.createdAt,
              senderType: lastMsg.senderType,
              senderId: lastMsg.senderId,
              file: lastMsg.file,
            }
          : null,
      };
    });

    // total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(tickets)
      .where(eq(tickets.userId, user.userId));

    return successResponse(
      res,
      200,
      {
        items: list,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Tickets fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const ticketInfo = await db
      .select({
        id: tickets.id,
        orderId: tickets.orderId,
        userId: tickets.userId,
        ticketStatus: tickets.ticketStatus,
        subject: tickets.subject,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        order: {
          id: orders.id,
          status: orders.status,
        },
      })
      .from(tickets)
      .where(eq(tickets.id, id))
      .leftJoin(orders, eq(tickets.orderId, orders.id))
      .orderBy(desc(tickets.createdAt));

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
      .where(eq(ticketMessages.ticketId, ticketInfo[0].id))
      .orderBy(asc(ticketMessages.createdAt));

    return successResponse(
      res,
      200,
      {
        ...ticketInfo[0],
        messages: messages,
      },
      "Ticket fetched successfully"
    );
  } catch (error) {
    console.log(error)
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const createTicket = async (req: Request, res: Response) => {
  try {
    const { orderId, subject, message } = req.body;
    const user = (req as any).user;
    const file = req.file;
    if (orderId && orderId !== "0") {
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
    }
    const parsedOrderId = Number(orderId); 

    if (isNaN(parsedOrderId)) {
      throw new Error("Invalid orderId"); 
    }
    
    const [newTicket] = await db
      .insert(tickets)
      .values({
        orderId: parsedOrderId !== 0 ? parsedOrderId : null,
        userId: user.userId,
        subject,
        ticketStatus: "open",
      })
      .returning();
    if (orderId && orderId !== "0") {  
      await db
        .update(orders)
        .set({ report: newTicket.id })
        .where(eq(orders.id, +orderId));
    }

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
    console.log(error)
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

    const ticket = await db.select().from(tickets).where(eq(tickets.userId , +user.userId))
    if(!ticket[0]){
      return errorResponse(res , 404 , "ticket is not found" , {})
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
