import { Router } from "express";
import {
  menuAccess,
  getMenuAccessDetails,
  getAllAccessRelatedToRole,
} from "../controller/menuAccessController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";
const router = Router();
router.post("/getByRole", authenticateJWT, getMenuAccessDetails); // get by role and Menuname , buttonAccess specific
router.post("/", authenticateJWT, menuAccess); // -- to insert and updated
router.post("/getRoleAccess", authenticateJWT, getAllAccessRelatedToRole); //  - get by role which will contains all menuName related to the role , buttonAccess

export default router;
