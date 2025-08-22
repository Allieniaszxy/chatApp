const jwt = require("jsonwebtoken");
const Group = require("../models/Group");
const Message = require("../models/Message");

function socketHandler(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // join many rooms (one per group)
    socket.on("group:join", (groupId) => {
      socket.join(groupId);
    });

    socket.on("message:send", async ({ groupId, text, type }) => {
      const msg = await Message.create({
        group: groupId,
        sender: socket.user._id,
        type: type || "text",
        text,
      });
      io.to(groupId).emit("message:new", {
        _id: msg._id,
        group: groupId,
        sender: socket.user._id,
        text: msg.text,
        createdAt: msg.createdAt,
      });
    });

    socket.on("typing", ({ groupId, isTyping }) => {
      socket.to(groupId).emit("typing", { userId: socket.user._id, isTyping });
    });

    socket.on("presence:update", (isOnline) => {
      socket.broadcast.emit("presence:update", {
        userId: socket.user._id,
        isOnline,
      });
    });
  });
}

module.exports = { socketHandler };
