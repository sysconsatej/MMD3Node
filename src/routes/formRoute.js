import express from "express";
import {
  deleteRecord,
  fetchForm,
  insertUpdate,
  uploadExcel,
} from "../controller/formController.js";

const router = express.Router();

router.post("/insertUpdate", insertUpdate);
router.post("/fetchForm", fetchForm);
router.post("/deleteRecord", deleteRecord);
router.post("/excelUpload", uploadExcel);

export default router;
