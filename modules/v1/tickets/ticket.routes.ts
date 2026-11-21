import express from "express";
import { auth } from "../../../middleware/auth";
import {
  createTicket,
  createTicketMessage,
  deleteTicket,
  deleteTicketMessage,
  getTicketById,
  getTickets,
  getTicketsCount,
  updateTicket,
} from "./ticket.controller";
import { uploadSingle } from "../../../middleware/upload";

const router = express.Router();
router.get("/count", auth, getTicketsCount);
router.get("/tickets", auth, getTickets);
router.get("/ticket/:id", auth, getTicketById);
router.post("/ticket", auth, uploadSingle("file"), createTicket);
router.post("/ticket/message", auth, uploadSingle("file"), createTicketMessage);
router.delete("/ticket/message/:id", auth, deleteTicketMessage);
router.put("/ticket/:id", auth, updateTicket);
router.delete("/ticket/:orderId", auth, deleteTicket);

export default router;
