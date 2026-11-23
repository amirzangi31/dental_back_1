import { Request, Response } from "express";
import path from "path";
import { db } from "../../../db";
import { errorResponse, successResponse } from "../../../utils/responses";
import { statusEnum, TicketStatus, ticketMessages, tickets } from "../../../db/schema/ticket";
import { and, asc, count, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { combineFilters, matchesText, oneOf, readQuery, searchText } from "../../../utils/listQuery";
import { orders } from "../../../db/schema/orders";
import { files } from "../../../db/schema/files";
import { users } from "../../../db/schema/users";
import { getPagination } from "../../../utils/pagination";

const lastMessageSenderType = sql`(
  SELECT sender_type
  FROM ticket_messages
  WHERE ticket_id = ${tickets.id}
  ORDER BY id DESC
  LIMIT 1
)`;

const ticketIsOpen = or(isNull(tickets.ticketStatus), ne(tickets.ticketStatus, "close"));

function sessionUserId(req: Request) {
  const user = (req as any).user;
  const id = Number(user?.userId || user?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

import { MAX_UPLOAD_FILES } from "../../../utils/uploadLimits";

function ticketFileIds(raw: unknown): number[] {
  let values: unknown[] = [];
  if (Array.isArray(raw)) values = raw;
  else if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) values = parsed;
    } catch {
      values = [];
    }
  } else if (raw !== undefined && raw !== null && raw !== "") {
    values = [raw];
  }
  const ids: number[] = [];
  for (const value of values) {
    const id = Number(value);
    if (Number.isInteger(id) && id > 0 && !ids.includes(id)) ids.push(id);
    if (ids.length >= MAX_UPLOAD_FILES) break;
  }
  return ids;
}

function storedTicketFiles(paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))].slice(0, MAX_UPLOAD_FILES);
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];
  return JSON.stringify(unique);
}

async function resolveTicketAttachment(
  req: Request,
): Promise<{ path: string | null; error?: string }> {
  const userId = sessionUserId(req);
  const uploaded = (
    Array.isArray(req.files) ? req.files : req.file ? [req.file] : []
  ) as Express.Multer.File[];
  const paths: string[] = [];

  for (const file of uploaded.slice(0, MAX_UPLOAD_FILES)) {
    const storedPath = file.path.replace(/\\/g, "/");
    await db.insert(files).values({
      filename: path.basename(storedPath).slice(0, 255),
      originalname: (file.originalname || "file").slice(0, 255),
      mimetype: (file.mimetype || "application/octet-stream").slice(0, 100),
      size: file.size,
      path: storedPath,
      user_id: userId,
    });
    paths.push(storedPath);
  }

  const ids = ticketFileIds(req.body?.fileIds ?? req.body?.fileId);
  if (ids.length > 0) {
    if (userId === null) return { path: null, error: "فایل پیوست معتبر نیست" };
    const owned = await db
      .select({ id: files.id, path: files.path })
      .from(files)
      .where(
        and(
          inArray(files.id, ids),
          eq(files.user_id, userId),
          or(eq(files.isDeleted, 0), isNull(files.isDeleted)),
        ),
      );
    if (owned.length !== ids.length) return { path: null, error: "فایل پیوست معتبر نیست" };
    const byId = new Map(owned.map((row) => [row.id, row.path]));
    ids.forEach((id) => {
      const stored = byId.get(id);
      if (stored) paths.push(stored);
    });
  }

  return { path: storedTicketFiles(paths) };
}

function countUnansweredMessages(
  messagesNewestFirst: { senderType: string }[],
  mySenderType: string,
  ticketStatus: string | null,
) {
  if (ticketStatus === "close") return 0;

  let unanswered = 0;
  for (const msg of messagesNewestFirst) {
    if (msg.senderType === mySenderType) break;
    unanswered += 1;
  }
  return unanswered;
}

export const getTicketsCount = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const waitingOnMe =
      user.role === "admin"
        ? sql`(${lastMessageSenderType}) = 'user'`
        : and(eq(tickets.userId, Number(user.userId)), sql`(${lastMessageSenderType}) = 'admin'`);

    const [result] = await db
      .select({ total: count() })
      .from(tickets)
      .where(and(ticketIsOpen, waitingOnMe));

    return successResponse(res, 200, { count: Number(result?.total ?? 0) }, "Tickets count fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getTickets = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const { limit, offset, sort } = getPagination(req);
    const status = oneOf(
      readQuery(req, "ticketStatus") || readQuery(req, "status"),
      statusEnum,
      "ticket status",
    );
    if (!status.ok) return errorResponse(res, 400, status.error, null);

    const whereClause = combineFilters(
      user.role === "admin" ? undefined : eq(tickets.userId, user.userId),
      status.value ? eq(tickets.ticketStatus, status.value as TicketStatus) : undefined,
      matchesText(searchText(req), [
        tickets.id,
        tickets.subject,
        orders.id,
        orders.patientname,
        orders.patientlastname,
        users.name,
        users.lastName,
      ]),
    );

    const orderByClause =
      sort === "asc" ? asc(tickets.createdAt) : desc(tickets.createdAt);

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
          patientname: orders.patientname,
          patientlastname: orders.patientlastname,
        },
        doctorName: users.name,
        doctorLastName: users.lastName,
      })
      .from(tickets)
      .leftJoin(orders, eq(tickets.orderId, orders.id))
      .leftJoin(users, eq(users.id, tickets.userId))
      .where(whereClause)
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
            .orderBy(desc(ticketMessages.id))
        : [];

    // پیام‌ها از جدید به قدیم هستند؛ اولین پیام هر تیکت آخرین پیام است
    const lastMessageMap = new Map<number, (typeof allMessages)[0]>();
    const messagesByTicket = new Map<number, (typeof allMessages)>();
    for (const msg of allMessages) {
      const thread = messagesByTicket.get(msg.ticketId);
      if (thread) thread.push(msg);
      else messagesByTicket.set(msg.ticketId, [msg]);

      if (!lastMessageMap.has(msg.ticketId)) {
        lastMessageMap.set(msg.ticketId, msg);
      }
    }

    const mySenderType = user.role === "admin" ? "admin" : "user";

    // ترکیب تیکت‌ها با آخرین پیام و تعداد پیام‌های بدون پاسخ
    const list = ticketsList.map((ticket) => {
      const lastMsg = lastMessageMap.get(ticket.id);
      const thread = messagesByTicket.get(ticket.id) ?? [];
      return {
        ...ticket,
        unansweredCount: countUnansweredMessages(thread, mySenderType, ticket.ticketStatus),
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

    const [{ total }] = await db
      .select({ total: count() })
      .from(tickets)
      .leftJoin(orders, eq(tickets.orderId, orders.id))
      .leftJoin(users, eq(users.id, tickets.userId))
      .where(whereClause);

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
      "Tickets fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const user = (req as any).user;

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
          patientname: orders.patientname,
          patientlastname: orders.patientlastname,
        },
        doctorName: users.name,
        doctorLastName: users.lastName,
      })
      .from(tickets)
      .where(eq(tickets.id, id))
      .leftJoin(orders, eq(tickets.orderId, orders.id))
      .leftJoin(users, eq(users.id, tickets.userId))
      .orderBy(desc(tickets.createdAt));

    if (!ticketInfo.length)
      return errorResponse(res, 404, "Ticket not found", null);

    // اگر کاربر admin نباشد، فقط تیکت‌های خودش را می‌تواند ببیند
    if (user.role !== "admin" && ticketInfo[0].userId !== user.userId) {
      return errorResponse(res, 403, "You are not authorized to view this ticket", null);
    }

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
      "Ticket fetched successfully",
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const createTicket = async (req: Request, res: Response) => {
  try {
    const { orderId, subject, message, userId } = req.body;
    const user = (req as any).user;
    const hasOrder = orderId !== undefined && orderId !== null && orderId !== "" && orderId !== "0" && orderId !== 0;
    let order: typeof orders.$inferSelect | undefined;

    if (hasOrder) {
      const [found] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, +orderId));

      if (!found) {
        return errorResponse(res, 404, "This order is not found", null);
      }
      if (found.report) {
        return errorResponse(res, 404, "This order has report", null);
      }
      order = found;
    }

    let ownerId = Number(user.userId);

    if (user.role === "admin") {
      const parsedUserId = Number(userId);
      if (userId !== undefined && userId !== null && userId !== "" && !Number.isNaN(parsedUserId) && parsedUserId > 0) {
        const [owner] = await db
          .select({ id: users.id, isDeleted: users.isDeleted })
          .from(users)
          .where(eq(users.id, parsedUserId));
        if (!owner || owner.isDeleted !== 1) {
          return errorResponse(res, 404, "User not found", null);
        }
        ownerId = owner.id;
      } else if (order?.user_id) {
        ownerId = order.user_id;
      } else {
        return errorResponse(res, 400, "User is required", null);
      }

      if (order && order.user_id !== ownerId) {
        return errorResponse(
          res,
          403,
          "You are not authorized to create ticket this order",
          null,
        );
      }
    } else if (order && order.user_id !== Number(user.userId)) {
      return errorResponse(
        res,
        403,
        "You are not authorized to create ticket this order",
        null,
      );
    }

    const parsedOrderId = hasOrder ? Number(orderId) : 0;

    if (Number.isNaN(parsedOrderId)) {
      return errorResponse(res, 400, "Invalid orderId", null);
    }

    const attached = await resolveTicketAttachment(req);
    if (attached.error) return errorResponse(res, 400, attached.error, null);

    const [newTicket] = await db
      .insert(tickets)
      .values({
        orderId: parsedOrderId !== 0 ? parsedOrderId : null,
        userId: ownerId,
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

    const msg = await db
      .insert(ticketMessages)
      .values({
        ticketId: newTicket.id,
        senderId: Number(user.userId),
        senderType: user.role === "admin" ? "admin" : "user",
        message: message ?? "",
        file: attached.path,
      })
      .returning();

    return successResponse(
      res,
      200,
      {
        ...newTicket,
        message: msg,
      },
      "Ticket created successfully",
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const updateTicket = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const user = (req as any).user;

    if (!id) {
      return errorResponse(res, 400, "Invalid ticket id", null);
    }

    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) {
      return errorResponse(res, 404, "Ticket not found", null);
    }
    if (user.role !== "admin" && ticket.userId !== Number(user.userId)) {
      return errorResponse(res, 403, "You are not authorized to update this ticket", null);
    }

    const [updated] = await db
      .update(tickets)
      .set({
        ticketStatus: "close",
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id))
      .returning();

    return successResponse(res, 200, updated, "Ticket updated successfully");
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
    const parsedTicketId = Number(ticketId);

    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, parsedTicketId));
    if (!ticket) {
      return errorResponse(res, 404, "ticket is not found", {});
    }
    if (ticket.ticketStatus === "close") {
      return errorResponse(res, 400, "Ticket is closed", null);
    }
    if (user.role !== "admin" && ticket.userId !== Number(user.userId)) {
      return errorResponse(res, 403, "You are not authorized to update this ticket", null);
    }

    const attached = await resolveTicketAttachment(req);
    if (attached.error) return errorResponse(res, 400, attached.error, null);

    const msg = await db
      .insert(ticketMessages)
      .values({
        ticketId: parsedTicketId,
        senderId: Number(user.userId),
        senderType: user.role === "admin" ? "admin" : "user",
        message: message ?? "",
        file: attached.path,
      })
      .returning();

    return successResponse(res, 200, msg[0], "Message sent successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const uploadTicketFile = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return errorResponse(res, 400, "فایل الزامی است", null);

    const storedPath = file.path.replace(/\\/g, "/");
    const [record] = await db
      .insert(files)
      .values({
        filename: path.basename(storedPath).slice(0, 255),
        originalname: (file.originalname || "file").slice(0, 255),
        mimetype: (file.mimetype || "application/octet-stream").slice(0, 100),
        size: file.size,
        path: storedPath,
        user_id: sessionUserId(req),
      })
      .returning();

    return successResponse(res, 200, record, "File uploaded successfully");
  } catch (error) {
    console.log(error);
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
