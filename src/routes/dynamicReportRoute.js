import { Router } from "express";
import { dynamicReportUpdate, getSpData } from "../controller/dynamicReportController.js";

const router = Router();

router.post("/dynamicReport", dynamicReportUpdate);
router.post("/spData", getSpData);

export default router;
