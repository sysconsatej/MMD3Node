import { Router } from "express";
import {
  menuAccess,
  getMenuAccessDetails,
  getAllAccessRelatedToRole,
} from "../controller/menuAccessController.js";
const router = Router();
router.post("/getByRole", getMenuAccessDetails);
router.post("/", menuAccess);
router.post("/getRoleAccess", getAllAccessRelatedToRole);
export default router;
