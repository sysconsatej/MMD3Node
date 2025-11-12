import { Router } from "express";
import { loginUser, logoutUser } from "../controller/userController.js";
import { getRole } from "../controller/userTypeController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = Router();
router.get("/login", loginUser);
router.get("/role", getRole);
router.post("/logout", authenticateJWT, logoutUser);

export default router;
