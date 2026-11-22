import express from "express";
import * as spacesController from "../controllers/spacesController.js";
import { requireLogin } from "../middleware/requireLogin.js";

function asyncHandler(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}

const router = express.Router();

router.get("/", asyncHandler(spacesController.index));
router.get("/:id", asyncHandler(spacesController.show));

router.post(
  "/",
  requireLogin,
  asyncHandler(spacesController.create)
);

router.patch(
  "/:id",
  requireLogin,
  asyncHandler(spacesController.update)
);

router.delete(
  "/:id",
  requireLogin,
  asyncHandler(spacesController.remove)
);

export default router;
