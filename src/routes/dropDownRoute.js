import express from "express";
import { getDropDownValues } from "../controller/dropDownController.js";

const router = express.Router();

router.post("/dropDownValues", getDropDownValues);

export default router;
