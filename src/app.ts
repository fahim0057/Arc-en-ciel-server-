import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { z, ZodError } from "zod";
import eventsRouter from "./routes/events";
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

app.use(eventsRouter);

// Anything that didn't match a route above
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler: must be last, and must have exactly 4 parameters
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: z.flattenError(err).fieldErrors,
    });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server" });
});

export default app;