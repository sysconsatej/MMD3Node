import { Router } from "express";
import {
  menuAccess,
  getMenuAccessDetails,
  getAllAccessRelatedToRole,
  getSpecificRoleData,
} from "../controller/menuAccessController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";
const router = Router();
router.post("/getByRole", authenticateJWT, getMenuAccessDetails); // get by role and Menuname , buttonAccess specific
router.post("/", authenticateJWT, menuAccess); // -- to insert and updated
router.post("/getRoleAccess", authenticateJWT, getAllAccessRelatedToRole); //  - get by role which will contains all menuName related to the role , buttonAccess
router.post("/specific-role", authenticateJWT, getSpecificRoleData); // for specific role(sub role)
export default router;
