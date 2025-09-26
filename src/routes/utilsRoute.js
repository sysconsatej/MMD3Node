import express from "express";
import {
  getDropDownValues,
  getTableValues,
  nextPrevData,
} from "../controller/utilsController.js";

const router = express.Router();

router.post("/dropDownValues", getDropDownValues);
router.post("/getTableValues", getTableValues);
router.post("/nextPrevData", nextPrevData);


export default router;
