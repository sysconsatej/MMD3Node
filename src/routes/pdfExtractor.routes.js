
    import express from "express";
    import { authenticateJWT } from "../middleware/authenticateJWT.js";

    import {
        extractPdfs,
        verifyExtractedInvoices,
        uploadVerifiedInvoices,
    } from "../controller/pdfExtractor.controller.js";

    const router = express.Router();

    router.post("/extract", extractPdfs);
    router.post("/verify", authenticateJWT, verifyExtractedInvoices);
    router.post("/upload-verified", authenticateJWT, uploadVerifiedInvoices);

    export default router;
