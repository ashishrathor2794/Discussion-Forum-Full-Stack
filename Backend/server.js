const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);

/* =========================
   CORS CONFIGURATION
========================= */

const allowedOrigins = [
  "http://localhost:5173",
  "https://discussion-forum-full-stack.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an origin
      // (Postman, server-to-server, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json());

/* =========================
   SOCKET.IO
========================= */

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("joinUser", (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

/* =========================
   MAKE IO AVAILABLE
========================= */

app.set("io", io);

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.json({
    message: "Discussion Forum API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend is working",
  });
});

/* =========================
   MONGODB CONNECTION
========================= */

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in environment variables");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

/* =========================
   ROUTES
========================= */

const authRoutes = require("./routes/auth");
const threadRoutes = require("./routes/threads");
const userRoutes = require("./routes/users");
const notificationRoutes = require("./routes/notifications");

app.use("/api/auth", authRoutes);
app.use("/api/threads", threadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

/* =========================
   ERROR HANDLER
========================= */

app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (error.message === "Not allowed by CORS") {
    return res.status(403).json({
      message: "CORS error: Origin not allowed",
    });
  }

  res.status(500).json({
    message: "Internal server error",
  });
});

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});