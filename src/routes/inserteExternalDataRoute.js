import express from "express";
import {
  insertExternalData,
} from "../controller/insertExternalDataController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = express.Router();

router.post("/insertExternalData", authenticateJWT, insertExternalData);


export default router;
