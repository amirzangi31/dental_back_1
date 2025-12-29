import express from "express";
import { auth } from "../../../middleware/auth";
import {
  createTicket,
  createTicketMessage,
  deleteTicket,
  deleteTicketMessage,
  getTicketById,
  getTickets,
  updateTicket,
} from "./ticket.controller";
import { validate } from "../../../middleware/schemaValidate";
import { uploadSingle } from "../../../middleware/upload";

const router = express.Router();

router.get("/tickets", auth, getTickets);
router.get("/ticket/:id", auth, getTicketById);
router.post("/ticket", auth, uploadSingle("file"), createTicket);
router.post("/ticket/message", auth, uploadSingle("file"), createTicketMessage);
router.delete("/ticket/message/:id", auth, deleteTicketMessage);
router.put("/ticket/:orderId", auth, updateTicket);
router.delete("/ticket/:orderId", auth, deleteTicket);

export default router;
