import express from "express";
import { uploadToSp } from "../controller/uploadController.js";

const router = express.Router();

router.post("/upload", uploadToSp);

export default router;
