// src/routes/reportsRoute.js
import express from "express";
import { emailPdfReports } from "../controller/reportsController.js";

const router = express.Router();
router.post("/emailPdfReports", emailPdfReports);

export default router;
