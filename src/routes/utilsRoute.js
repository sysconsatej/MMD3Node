import express from "express";
import {
  getDropDownValues,
  getTableValues,
} from "../controller/utilsController.js";

const router = express.Router();

router.post("/dropDownValues", getDropDownValues);
router.post("/getTableValues", getTableValues);

export default router;
