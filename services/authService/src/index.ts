import express from "express";
import type { Request, Response } from "express";
const app = express();
import dotenv from "dotenv";
dotenv.config();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript Backend is running!');
});

app.get("/getCount", (req: Request, res: Response) => {
  res.json({ count: 0 });
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});