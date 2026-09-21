import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Campus Study Space Finder");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});