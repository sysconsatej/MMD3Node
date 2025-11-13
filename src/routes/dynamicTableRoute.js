import express from "express";
import { getDynamicTable} from "../controller/dynamicTableController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = express.Router();

router.post("/dynamicTable", authenticateJWT  ,getDynamicTable);

export default router;
