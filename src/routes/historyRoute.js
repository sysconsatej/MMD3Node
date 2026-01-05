import express from "express";
import { getHblColumnChanges, getHistoryAPI, getHistoryData, getInvoiceHistory, getInvoiceReleaseHistoryAPI } from "../controller/historyController.js";

const router = express.Router();

// GET /api/history?tableName=tblBl&id=6283
router.get("/history", getHistoryData);
router.get("/history/invoice", getInvoiceHistory);
router.get("/history/invoiceRelease", getInvoiceReleaseHistoryAPI);
router.post("/getHblColumnChanges", getHblColumnChanges);
router.get("/historyData", getHistoryAPI);


export default router;
