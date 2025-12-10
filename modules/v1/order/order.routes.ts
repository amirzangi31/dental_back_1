import express from "express";
import { auth } from "../../../middleware/auth";
import {
  changeOrderStatus,
  createOrder,
  getOrderWithId,
  orderDropDown,
  orderList,
  orderListAdmin,
  submitOrder,
  updateOrder,
  downloadAdminFile,
} from "./order.controller";
import { uploadSingle } from "../../../middleware/upload";
import { uploadAdminOrderFile } from "../../../middleware/adminOrderUpload";
import { isAdmin } from "../../../middleware/isAdmin";

const router = express.Router();

router.post("/order", auth, createOrder);
router.get("/order/:id", auth, getOrderWithId);
router.put("/order/:id", auth, updateOrder);
router.put("/submitorderwithuser/:id", auth, uploadSingle("file"), submitOrder);
router.get("/orderlist", auth, orderList);
router.get("/orders/dropdown", auth, orderDropDown);
router.get("/orderlistadmin", auth, orderListAdmin);
router.put("/changeorderstatus", auth, isAdmin, uploadAdminOrderFile("file"), changeOrderStatus);
router.get("/download-admin-file/:id", auth, downloadAdminFile);
export default router;
