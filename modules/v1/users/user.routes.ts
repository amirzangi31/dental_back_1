import express from "express";
import { deleteUser, getUsersList, getUserById, getUser, updateUser, editUser } from "./user.controller";
import { auth } from "../../../middleware/auth";
import { validate } from "../../../middleware/schemaValidate";
import { updateUserSchema } from "../../../db/validations/users";

const router = express.Router();

router.get("/user", auth, getUser);
router.put("/updateuser", auth, validate(updateUserSchema), updateUser);
router.get("/userslist", auth, getUsersList);
router.get("/user/:id", auth, getUserById);
router.delete("/user/:id", auth, deleteUser);
router.put("/edituser/:id", auth, validate(updateUserSchema), editUser);

export default router;
