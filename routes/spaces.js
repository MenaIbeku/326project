import express from "express";
import * as spacesController from "../controllers/spacesController.js";

function asyncHandler(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}

const router = express.Router();

router.get("/", asyncHandler(spacesController.index));
router.post("/", asyncHandler(spacesController.create));

export default router;
