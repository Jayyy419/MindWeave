import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import entriesRouter from "./routes/entries";
import userRouter from "./routes/user";
import thinkTanksRouter from "./routes/thinktanks";
import { authMiddleware } from "./middleware/auth";

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check (no auth required)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// All API routes require anonymous user identification
app.use("/api/entries", authMiddleware, entriesRouter);
app.use("/api/user", authMiddleware, userRouter);
app.use("/api/thinktanks", authMiddleware, thinkTanksRouter);

// Start server
app.listen(PORT, () => {
  console.log(`MindWeave backend running at http://localhost:${PORT}`);
});
