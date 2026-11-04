import app from "./app";

const port = Number(process.env.PORT) || 8000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});