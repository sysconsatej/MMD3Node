import express from "express";
import { fetchForm, insertUpdate } from "../controller/formController.js";

const router = express.Router();

router.post("/insertUpdate", insertUpdate);
router.post("/fetchForm", fetchForm);

export default router;
