import { Router } from "express";
import { getMenuButton } from "../controller/getMenuButtonController.js";

const router = Router();
router.get("/", getMenuButton);

export default router;
