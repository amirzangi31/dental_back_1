import express from "express";
import { getUser, updateUser } from "./user.controller";
import { auth } from "../../../middleware/auth";
import { validate } from "../../../middleware/schemaValidate";
import { updateUserSchema } from "../../../db/validations/users";

const router = express.Router();

router.get("/user", auth, getUser);
router.put("/updateuser", auth, validate(updateUserSchema), updateUser);

export default router;
