import express from "express";
import {
  deleteRecord,
  fetchForm,
  insertUpdate,
} from "../controller/formController.js";

const router = express.Router();

router.post("/insertUpdate", insertUpdate);
router.post("/fetchForm", fetchForm);
router.post("/deleteRecord", deleteRecord);

export default router;
