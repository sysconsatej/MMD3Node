
import express from "express";
import { extractPdfs } from "../controller/pdfExtractor.controller.js";

const router = express.Router();

router.post("/extract", extractPdfs);

export default router;
