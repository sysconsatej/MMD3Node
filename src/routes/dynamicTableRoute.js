import express from "express";
import { getDynamicTable, getSpData, } from "../controller/dynamicTableController.js";

const router = express.Router();

router.post("/dynamicTable", getDynamicTable);
router.post("/spData", getSpData);

export default router;
