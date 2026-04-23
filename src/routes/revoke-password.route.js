import { Router } from "express";
import { authenticateJWT } from "../middleware/authenticateJWT.js";
import { revokePassword } from "../controller/revoke-password.controller.js";

const router = Router();
router.post("/revoke-password", authenticateJWT, revokePassword);

export default router;
