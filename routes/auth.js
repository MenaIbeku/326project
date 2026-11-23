import express from "express";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.method === "POST") {
    // JSON-only writes prevent cross-site HTML form submissions (including login CSRF).
    const contentType = req.get("Content-Type")?.split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      return res.status(415).json({ error: "Use application/json for authentication requests." });
    }
    const origin = req.get("Origin");
    const expectedOrigin = `${req.protocol}://${req.get("host")}`;
    if (origin && origin !== expectedOrigin) {
      return res.status(403).json({ error: "Cross-origin authentication requests are not allowed." });
    }
  }
  next();
});

// Express 5 forwards rejected async handlers to the application's error middleware.
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authController.me);

export default router;
