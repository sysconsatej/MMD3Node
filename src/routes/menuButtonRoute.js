import { Router } from "express";
import {
  getMenuButton,
} from "../controller/getMenuButtonController.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = Router();
router.get("/", authenticateJWT, getMenuButton); //  -- get all MenuButtons related to Menu just to print

export default router;
