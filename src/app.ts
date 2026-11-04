import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ name: "Community Events API", status: "ok" });
});

// Anything that didn't match a route above
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;