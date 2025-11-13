import express from "express";
import {
  getDropDownValues,
  getTableValues,
  nextPrevData,
} from "../controller/utilsController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";
const router = express.Router();

router.post("/dropDownValues", authenticateJWT, getDropDownValues);
router.post("/getTableValues", authenticateJWT, getTableValues);
router.post("/nextPrevData", authenticateJWT, nextPrevData);

export default router;
