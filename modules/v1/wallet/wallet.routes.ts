import express from "express";
import { auth } from "../../../middleware/auth";
import { isAdmin } from "../../../middleware/isAdmin";
import { validate } from "../../../middleware/schemaValidate";
import { adminWalletIncreaseSchema } from "../../../db/validations/wallet";
import { getWallet, increaseWalletBalance, startWalletTopup } from "./wallet.controller";

const router = express.Router();

router.get("/", auth, getWallet);
router.post("/topup", auth, startWalletTopup);
router.post("/admin/credit", auth, isAdmin, validate(adminWalletIncreaseSchema), increaseWalletBalance);

export default router;
