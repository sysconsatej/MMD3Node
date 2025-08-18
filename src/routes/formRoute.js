import express from "express";
import { insertUpdate } from "../controller/formController.js";

const router = express.Router();

router.post("/insertUpdate", insertUpdate);

export default router;
