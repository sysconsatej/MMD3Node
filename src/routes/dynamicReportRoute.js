import { Router } from "express";
import { dynamicReportUpdate, getIgmBlData, getSpData, getBlDataForDO, localPDFReports, execSpJsonUniversal } from "../controller/dynamicReportController.js";

const router = Router();

router.post("/dynamicReport", dynamicReportUpdate);
router.post("/spData", getSpData);
router.post("/igmData", getIgmBlData);
router.post("/localPDFReports", localPDFReports);
router.post("/blDataForDO", getBlDataForDO);
router.post("/execSpJsonUniversal", execSpJsonUniversal);



export default router;
