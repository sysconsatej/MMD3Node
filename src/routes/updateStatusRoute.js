import express from "express";
import { updateStatus } from "../controller/updateStatusController.js";

const router = express.Router();

// be tolerant on this router: accept json, urlencoded, and raw text
router.use(express.json({ limit: "2mb" }));
router.use(express.urlencoded({ extended: true }));
router.use(express.text({ type: "*/*", limit: "2mb" }));

// POST /api/v1/updateStatus
router.post("/updateStatus", updateStatus);

export default router;
