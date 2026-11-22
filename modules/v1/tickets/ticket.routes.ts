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
  uploadTicketFile,
} from "./ticket.controller";
import { uploadSingleOrderFile } from "../../../middleware/orderFormDataUpload";

const router = express.Router();
router.get("/count", auth, getTicketsCount);
router.get("/tickets", auth, getTickets);
router.get("/ticket/:id", auth, getTicketById);
router.post("/file", auth, uploadSingleOrderFile, uploadTicketFile);
router.post("/ticket", auth, uploadSingleOrderFile, createTicket);
router.post("/ticket/message", auth, uploadSingleOrderFile, createTicketMessage);
router.delete("/ticket/message/:id", auth, deleteTicketMessage);
router.put("/ticket/:id", auth, updateTicket);
router.delete("/ticket/:orderId", auth, deleteTicket);

export default router;
