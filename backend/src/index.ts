import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import entriesRouter from "./routes/entries";
import userRouter from "./routes/user";
import thinkTanksRouter from "./routes/thinktanks";
import opportunitiesRouter from "./routes/opportunities";
import learningRouter from "./routes/learning";
import authRouter from "./routes/auth";
import { authMiddleware } from "./middleware/auth";

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const allowedOrigins = CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigin: cors.CorsOptions["origin"] =
  allowedOrigins.length === 1 && allowedOrigins[0] === "*"
    ? true
    : (origin, callback) => {
        // Allow non-browser requests with no Origin header.
        if (!origin) {
          callback(null, true);
          return;
        }

        callback(null, allowedOrigins.includes(origin));
      };

// Middleware
app.use(
  cors({
    origin: corsOrigin,
  })
);
app.use(express.json());

// Health check (no auth required)
app.get("/", (_req, res) => {
  res.status(200).send("MindWeave backend is running");
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Authentication routes (no auth middleware required)
app.use("/api/auth", authRouter);

// All API routes require anonymous user identification
app.use("/api/entries", authMiddleware, entriesRouter);
app.use("/api/user", authMiddleware, userRouter);
app.use("/api/thinktanks", authMiddleware, thinkTanksRouter);
app.use("/api/opportunities", authMiddleware, opportunitiesRouter);
app.use("/api/learning", authMiddleware, learningRouter);

// Start server
app.listen(PORT, () => {
  console.log(`MindWeave backend running at http://localhost:${PORT}`);
});
