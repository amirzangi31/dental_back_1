import express from "express";
import { auth } from "../../../middleware/auth";
import {
  changeOrderStatus,
  createOrder,
  createOrderWithRefrence,
  getOrderWithId,
  orderDropDown,
  orderList,
  orderListAdmin,
  submitOrder,
  updateOrder,
  downloadAdminFile,
  calculateOrderPrice,
  generateMaterialFilesPDF,
  addOrderToDesigner,
  orderlistdesinger,
  uploadDesignerFile,
} from "./order.controller";
import { uploadSingle } from "../../../middleware/upload";
import { uploadAdminOrderFile } from "../../../middleware/adminOrderUpload";
import { processOrderFormData } from "../../../middleware/orderFormDataUpload";
import { isAdmin } from "../../../middleware/isAdmin";

const router = express.Router();

router.post("/order", auth, processOrderFormData, createOrder);
router.post("/order/:id/with-reference", auth, processOrderFormData, createOrderWithRefrence);
router.post("/calculateOrderPrice", calculateOrderPrice);
router.get("/order/:id/material-files-pdf", auth, generateMaterialFilesPDF);
router.get("/order/:id", auth, getOrderWithId);
router.put("/order/:id", auth, updateOrder);
router.put(
  "/order/uploaddesignerfile/:orderId",
  auth,
  uploadSingle("file"),
  uploadDesignerFile
);
router.put("/submitorderwithuser/:id", auth, uploadSingle("file"), submitOrder);
router.get("/orderlist", auth, orderList);
router.get("/orders/dropdown", auth, orderDropDown);
router.get("/orderlistadmin", auth, orderListAdmin);
router.get("/orderlistdesinger", auth, orderlistdesinger);
router.put(
  "/changeorderstatus",
  auth,
  isAdmin,
  uploadAdminOrderFile("file"),
  changeOrderStatus
);
router.get("/download-admin-file/:id", auth, downloadAdminFile);
router.put("/order/:id/assign-designer", auth, isAdmin, addOrderToDesigner);
export default router;
