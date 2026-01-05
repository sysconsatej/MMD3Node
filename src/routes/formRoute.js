import express from "express";
import {
  deleteRecord,
  fetchForm,
  validatePrint,
  insertUpdate,
  uploadExcel,
} from "../controller/formController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = express.Router();

router.post("/insertUpdate", authenticateJWT, insertUpdate);
router.post("/fetchForm", authenticateJWT, fetchForm);
router.post("/validatePrint", validatePrint);
router.post("/deleteRecord", authenticateJWT, deleteRecord);
router.post("/excelUpload", authenticateJWT, uploadExcel);

export default router;
