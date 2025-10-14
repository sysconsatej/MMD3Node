import { Router } from "express";
import { dynamicReportUpdate, getIgmBlData, getSpData, getBlDataForDO } from "../controller/dynamicReportController.js";

const router = Router();

router.post("/dynamicReport", dynamicReportUpdate);
router.post("/spData", getSpData);
router.post("/igmData", getIgmBlData);
router.post("/blDataForDO", getBlDataForDO);



export default router;
