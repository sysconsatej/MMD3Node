import { Router } from "express";
import { getChartData } from "../controller/chartController.js";

const router = Router();
router.get("/", getChartData);

export default router;
