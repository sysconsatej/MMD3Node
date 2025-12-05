import { Router } from "express";
import { authenticateJWT } from "../middleware/authenticateJWT.js";
import { blWorkFlow } from "../controller/bl-workflow.controller.js";

const router = Router();
router.get("/:blNo", authenticateJWT, blWorkFlow);

export default router;
