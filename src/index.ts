import app from "./app";
import { getDb } from "./config/db";

const port = Number(process.env.PORT) || 8000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  getDb()
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection failed:", err.message));
});