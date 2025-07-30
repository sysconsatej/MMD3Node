import express from "express";
import { createMaster } from "../controller/masterController.js";

const router = express.Router();

router.post("/createMaster", createMaster);

export default router;
