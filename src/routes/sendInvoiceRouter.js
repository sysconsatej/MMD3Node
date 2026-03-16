import { Router } from "express";
import { sendInvoiceEmail } from "../controller/sendInvoiceController.js";
const router = Router();
router.post("/sendInvoiceEmail", sendInvoiceEmail);
export default router;
