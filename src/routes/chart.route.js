import { Router } from "express";
import { getChartData } from "../controller/chartController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = Router();
router.get("/", authenticateJWT, getChartData);

export default router;
