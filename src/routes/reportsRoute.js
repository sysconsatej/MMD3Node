// src/routes/reportsRoute.js
import express from "express";
import { emailPdfReports, localPDFReports } from "../controller/reportsController.js";

const router = express.Router();
router.post("/emailPdfReports", emailPdfReports);
router.post("/localPDFReports", localPDFReports);


export default router;
