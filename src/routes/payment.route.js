import express from "express";
import {
  fetchTransaction,
  paymentController,
} from "../controller/paymentController.js";

const router = express.Router();

router.get("/pay", paymentController);
router.get("/response", fetchTransaction);

export default router;
