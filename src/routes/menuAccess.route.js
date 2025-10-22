import { Router } from "express";
import {
  menuAccess,
  getMenuAccessDetails,
} from "../controller/menuAccessController.js";
const router = Router();
router.post("/getByRole", getMenuAccessDetails);
router.post("/", menuAccess);
export default router;
