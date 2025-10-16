import { Router } from "express";
import {
  menuAccess,
  getMenuAccessDetails,
} from "../controller/menuAccessController.js";
const router = Router();
router.get("/:roleId", getMenuAccessDetails);
router.post("/", menuAccess);
export default router;
