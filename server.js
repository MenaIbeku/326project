import "dotenv/config";
import express from "express";
import { connectDatabase } from "./config/database.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Campus Study Space Finder");
});

app.get("/spaces", (req, res) => {
  res.send("Available Study Spaces on Campus");
});

try {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
} catch {
  // Connection errors may contain credentials; keep them out of console output.
  console.error("Database connection failed. Check MONGODB_URI and MongoDB availability.");
  process.exitCode = 1;
}
