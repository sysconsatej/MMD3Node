import express from "express";
import {
  getHblColumnChanges,
  getHistoryAPI,
  getHistoryData,
  getInvoiceHistory,
  getInvoiceReleaseHistoryAPI,
} from "../controller/historyController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = express.Router();

// GET /api/history?tableName=tblBl&id=6283
router.get("/history", authenticateJWT, getHistoryData);
router.get("/history/invoice", authenticateJWT, getInvoiceHistory);
router.get(
  "/history/invoiceRelease",
  authenticateJWT,
  getInvoiceReleaseHistoryAPI,
);
router.post("/getHblColumnChanges", authenticateJWT, getHblColumnChanges);
router.get("/historyData", authenticateJWT, getHistoryAPI);

export default router;
