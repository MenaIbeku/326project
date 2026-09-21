import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Campus Study Space Finder");
});

app.get("/study-spaces", (req, res) => {
  res.send("Available Study Spaces on Campus");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
