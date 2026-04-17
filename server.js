const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("Soulfood video signaling server is running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const socketRoomMap = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, userType }) => {
    socket.join(roomId);
    socketRoomMap.set(socket.id, roomId);
    console.log(`${userType || "user"} joined room ${roomId}`);
    socket.to(roomId).emit("user-joined");
  });

  socket.on("leave-room", ({ roomId, reason }) => {
    socket.leave(roomId);
    socketRoomMap.delete(socket.id);
    socket.to(roomId).emit("user-left", {
      reason: reason || "left-call"
    });
  });

  socket.on("chat-message", ({ roomId, message, sender }) => {
    socket.to(roomId).emit("chat-message", {
      message,
      sender,
      time: new Date().toISOString()
    });
  });

  socket.on("webrtc-offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("webrtc-offer", { offer });
  });

  socket.on("webrtc-answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("webrtc-answer", { answer });
  });

  socket.on("webrtc-ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("webrtc-ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    const roomId = socketRoomMap.get(socket.id);

    if (roomId) {
      socket.to(roomId).emit("user-left", {
        reason: "disconnected"
      });
      socketRoomMap.delete(socket.id);
    }

    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Soulfood video signaling server is running on port ${PORT}`);
});
