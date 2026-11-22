import express from "express";
import { createSessionMiddleware } from "./config/session.js";
import authRouter from "./routes/auth.js";
import spacesRouter from "./routes/spaces.js";

export function createApp({
  sessionStore,
  sessionSecret,
  nodeEnv = "development",
  trustProxy = false,
}) {
  const app = express();
  app.set("env", nodeEnv);
  app.set("trust proxy", trustProxy);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use(express.urlencoded({ extended: true, limit: "16kb" }));
  app.set("view engine", "ejs");
  app.use(express.static("public"));

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(createSessionMiddleware({
    store: sessionStore,
    secret: sessionSecret,
    nodeEnv,
  }));

  app.get("/", (req, res) => {
    res.send("Campus Study Space Finder");
  });
  app.use("/auth", authRouter);
  app.use("/spaces", spacesRouter);

  app.use((err, req, res, next) => {
    const status = err.status ?? err.statusCode;
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      const message = err.type === "entity.parse.failed"
        ? "Invalid JSON in request body."
        : "Invalid request.";
      return res.status(status).json({ error: message });
    }

    // Never print request bodies, hashes, or database errors containing credentials.
    console.error("Request failed.");
    return res.status(500).json({ error: "Something went wrong." });
  });
  return app;
}
