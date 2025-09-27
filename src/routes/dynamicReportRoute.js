import { Router } from "express";
import { dynamicReportUpdate } from "../controller/dynamicReportUpdateController.js";

const router = Router();

router.post("/dynamicReport", dynamicReportUpdate);

export default router;
