import express from "express";
import {
  insertExternalData,
} from "../controller/insertExternalDataController.js";

const router = express.Router();

router.post("/insertExternalData", insertExternalData);


export default router;
