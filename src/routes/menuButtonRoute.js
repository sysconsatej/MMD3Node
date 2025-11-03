import { Router } from "express";
import {
  getMenuButton,
} from "../controller/getMenuButtonController.js";

const router = Router();
router.get("/", getMenuButton); //  -- get all MenuButtons related to Menu just to print

export default router;
