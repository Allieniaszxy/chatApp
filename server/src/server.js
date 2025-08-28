import http from "http";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import Group from "./models/Group.js";
import Message from "./models/Message.js";

dotenv.config();

const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

// online users map userId => socketId(s)
const onlineMap = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(); // allow anonymous connection if no token -- you may reject instead
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = user.id;
    next();
  } catch (e) {
    // optionally reject: next(new Error('Unauthorized'));
    next();
  }
});

io.on("connection", (socket) => {
  const uid = socket.userId;
  if (uid) {
    // keep set of socketIds per user id (support multi-tab)
    const set = onlineMap.get(uid) || new Set();
    set.add(socket.id);
    onlineMap.set(uid, set);
    // broadcast list of online user ids
    io.emit("online:users", [...onlineMap.keys()]);
  }

  socket.on("join-group", (groupId) => {
    socket.join(groupId);
  });

  socket.on("leave-group", (groupId) => {
    socket.leave(groupId);
  });

  socket.on("typing", ({ groupId }) => {
    socket.to(groupId).emit("typing", { userId: socket.userId });
  });

  socket.on("send-message", async (msg) => {
    // msg should include groupId, text (or imageUrl/voiceUrl)
    try {
      const group = await Group.findById(msg.groupId);
      if (!group) return;
      const isMember = group.members.some((m) => m.user.equals(socket.userId));
      if (!isMember) return;
      // create the message in DB if not already
      const newMsg = await Message.create({
        group: msg.groupId,
        sender: socket.userId,
        text: msg.text || "",
        imageUrl: msg.imageUrl || undefined,
        voiceUrl: msg.voiceUrl || undefined,
      });
      group.lastMessage = newMsg._id;
      await group.save();
      const full = await newMsg.populate("sender", "name");
      io.to(msg.groupId).emit("receive-message", full);
    } catch (e) {
      console.error("send-message error", e.message);
    }
  });

  socket.on("disconnect", () => {
    if (uid) {
      const set = onlineMap.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) onlineMap.delete(uid);
      }
      io.emit("online:users", [...onlineMap.keys()]);
    }
  });
});

const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGO_URI).then(() => {
  server.listen(PORT, () =>
    console.log(`🚀 Server on http://localhost:${PORT}`)
  );
});
