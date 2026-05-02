import agentAPI from "apminsight";
agentAPI.config()

import express, { Request, Response } from "express";
import subjectRouter from "./routes/subjects";
import cors from "cors";
import securityMiddleware from "./middleware/security";

const app = express();
const PORT = 8000;





app.use(cors({
  origin:process.env.FRONTEND_URL,
  methods:['GET','POST','PUT','DELETE'],
  credentials:true

}))

// Middleware
app.use(express.json());

app.use(securityMiddleware);

app.use('/api/subjects',subjectRouter)
// Root route
app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Server is running successfully!");
});

// Start server.
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});