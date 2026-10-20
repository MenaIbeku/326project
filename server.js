import "dotenv/config";
import express from "express";
import { connectDatabase } from "./config/database.js";
import spacesRouter from "./routes/spaces.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Campus Study Space Finder");
});

app.use("/spaces", spacesRouter);

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
