import express from "express";
import {
  fetchTransaction,
  paymentController,
} from "../controller/paymentController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = express.Router();

router.get("/pay", authenticateJWT, paymentController);
router.get("/response", authenticateJWT, fetchTransaction);

export default router;
