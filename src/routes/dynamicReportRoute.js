import { Router } from "express";
import { dynamicReportUpdate, getIgmBlData, getSpData } from "../controller/dynamicReportController.js";

const router = Router();

router.post("/dynamicReport", dynamicReportUpdate);
router.post("/spData", getSpData);
router.post("/igmData", getIgmBlData);

export default router;
