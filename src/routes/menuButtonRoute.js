import { Router } from "express";
import { getMenuButton , updateMenuButton } from "../controller/getMenuButtonController.js";

const router = Router();
router.get("/", getMenuButton);
router.put("/", updateMenuButton);


export default router;
