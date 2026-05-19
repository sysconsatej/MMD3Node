import { Router } from "express";
import {
  dynamicReportUpdate,
  getIgmBlData,
  getSpData,
  getBlDataForDO,
  localPDFReports,
  execSpJsonUniversal,
} from "../controller/dynamicReportController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = Router();

router.post("/dynamicReport", authenticateJWT, dynamicReportUpdate);
router.post("/spData", authenticateJWT, getSpData);
router.post("/igmData", authenticateJWT, getIgmBlData);
router.post("/localPDFReports", localPDFReports);
router.post("/blDataForDO", authenticateJWT, getBlDataForDO);
router.post("/execSpJsonUniversal", authenticateJWT, execSpJsonUniversal);

export default router;
