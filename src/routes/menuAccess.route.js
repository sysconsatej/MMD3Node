import { Router } from "express";
import { menuAccess } from "../controller/menuAccessController.js";
const router = Router();
router.post("/", menuAccess);
export default router;
