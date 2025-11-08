import { Router } from "express";
import { loginUser } from "../controller/userController.js";
import { getRole } from "../controller/userTypeController.js";
import { getAllUsers } from "../controller/getAllUserController.js";

const router = Router();
router.get("/login", loginUser);
router.get("/role", getRole);
router.get("/", getAllUsers);


export default router;
