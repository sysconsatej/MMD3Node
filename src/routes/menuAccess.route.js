import { Router } from "express";
import {
  menuAccess,
  getMenuAccessDetails,
  getAllAccessRelatedToRole,
} from "../controller/menuAccessController.js";
const router = Router();
router.post("/getByRole", getMenuAccessDetails); // get by role and Menuname , buttonAccess specific
router.post("/", menuAccess); // -- to insert and updated
router.post("/getRoleAccess", getAllAccessRelatedToRole); //  - get by role which will contains all menuName related to the role , buttonAccess

export default router;
