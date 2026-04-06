import express, { Request, Response } from "express";

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());

// Root route
app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Server is running successfully!");
});

// Start server.
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});