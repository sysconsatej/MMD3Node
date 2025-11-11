import { Router } from "express";
import { loginUser, logoutUser } from "../controller/userController.js";
import { getRole } from "../controller/userTypeController.js";
import { getAllUsers } from "../controller/getAllUserController.js";

const router = Router();
router.get("/login", loginUser);
router.get("/role", getRole);
router.get("/", getAllUsers);
router.post("/logout", logoutUser);


export default router;
