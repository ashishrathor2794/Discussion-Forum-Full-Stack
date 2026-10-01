import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import threadRoutes from "./routes/threads.js";
import userRoutes from "./routes/users.js";
import notificationRoutes from "./routes/notifications.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.set("io", io);

app.get("/", (_req, res) => {
  res.json({ message: "Discussion Forum API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/threads", threadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });
  socket.on("disconnect", () => {});
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
