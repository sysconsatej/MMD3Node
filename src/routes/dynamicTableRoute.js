import express from "express";
import { getDynamicTable} from "../controller/dynamicTableController.js";

const router = express.Router();

router.post("/dynamicTable", getDynamicTable);

export default router;
