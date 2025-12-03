import express from "express";
import { getHistoryData } from "../controller/historyController.js";

const router = express.Router();

// GET /api/history?tableName=tblBl&id=6283
router.get("/history", getHistoryData);

export default router;
