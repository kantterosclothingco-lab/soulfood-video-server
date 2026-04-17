const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Soulfood video signaling server is running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const socketRoomMap = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, userType }) => {
    socket.join(roomId);
    socketRoomMap.set(socket.id, roomId);

    console.log(`${userType} joined room ${roomId}`);

    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userType,
    });
  });

  socket.on("leave-room", ({ roomId, reason }) => {
    socket.leave(roomId);
    socketRoomMap.delete(socket.id);

    socket.to(roomId).emit("user-left", {
      socketId: socket.id,
      reason: reason || "left-call",
    });
  });

  socket.on("chat-message", ({ roomId, message, sender }) => {
    console.log("Chat message:", roomId, sender, message);

    socket.to(roomId).emit("chat-message", {
      message,
      sender,
      time: new Date().toISOString(),
    });
  });

  socket.on("webrtc-offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("webrtc-offer", {
      offer,
      from: socket.id,
    });
  });

  socket.on("webrtc-answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("webrtc-answer", {
      answer,
      from: socket.id,
    });
  });

  socket.on("webrtc-ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("webrtc-ice-candidate", {
      candidate,
      from: socket.id,
    });
  });

  socket.on("disconnect", () => {
    const roomId = socketRoomMap.get(socket.id);

    if (roomId) {
      socket.to(roomId).emit("user-left", {
        socketId: socket.id,
        reason: "disconnected",
      });
      socketRoomMap.delete(socket.id);
    }

    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
