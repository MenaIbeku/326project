import express from "express";
import * as spacesController from "../controllers/spacesController.js";

const router = express.Router();

router.get("/", spacesController.index);
router.post("/", spacesController.create);

export default router;
