import express from "express";
import { uploadToSp, invoiceUploadPDF } from "../controller/uploadController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = express.Router();

router.post("/upload", uploadToSp);
router.post("/invoice-upload", authenticateJWT, invoiceUploadPDF);

export default router;
