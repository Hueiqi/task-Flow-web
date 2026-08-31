require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const { JWT_SECRET } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

const frontendDist = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(path.join(frontendDist, "index.html"))) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(frontendDist, "index.html")));
}

// eslint-disable-next-line no-unused-vars
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

function startServer(port = PORT) {
  return app.listen(port, "127.0.0.1", () => {
    console.log(`TaskFlow API running on http://localhost:${port}`);
    if (JWT_SECRET === "dev-secret-change-me") {
      console.warn("Warning: using default JWT_SECRET. Set JWT_SECRET in .env for anything beyond local dev.");
    }
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
