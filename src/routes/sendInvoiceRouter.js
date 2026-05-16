import { Router } from "express";
import { sendInvoiceEmail } from "../controller/sendInvoiceController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";
const router = Router();
router.post("/sendInvoiceEmail",authenticateJWT, sendInvoiceEmail);
export default router;
