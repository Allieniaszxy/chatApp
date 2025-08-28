import express from "express";
import multer from "multer";
import Message from "../models/Message.js";
import Group from "../models/Group.js";
import { auth } from "../middleware/auth.js";
import path from "path";
import fs from "fs";

const router = express.Router();
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage });

// Get recent messages
router.get("/:groupId", auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const isMember = group.members.some((m) => m.user.equals(req.user.id));
    if (!isMember) return res.status(403).json({ message: "Join group first" });
    const msgs = await Message.find({ group: groupId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "name");
    res.json(msgs.reverse());
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Send text message (REST fallback)
router.post("/:groupId", auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const isMember = group.members.some((m) => m.user.equals(req.user.id));
    if (!isMember) return res.status(403).json({ message: "Join group first" });
    const msg = await Message.create({
      group: groupId,
      sender: req.user.id,
      text,
    });
    group.lastMessage = msg._id;
    await group.save();
    res.json(await msg.populate("sender", "name"));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Upload image
router.post(
  "/:groupId/image",
  auth,
  upload.single("image"),
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      const isMember = group.members.some((m) => m.user.equals(req.user.id));
      if (!isMember)
        return res.status(403).json({ message: "Join group first" });
      const imageUrl = `/uploads/${req.file.filename}`;
      const msg = await Message.create({
        group: groupId,
        sender: req.user.id,
        imageUrl,
      });
      group.lastMessage = msg._id;
      await group.save();
      res.json(await msg.populate("sender", "name"));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

// Upload voice note
router.post(
  "/:groupId/voice",
  auth,
  upload.single("voice"),
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      const isMember = group.members.some((m) => m.user.equals(req.user.id));
      if (!isMember)
        return res.status(403).json({ message: "Join group first" });
      const voiceUrl = `/uploads/${req.file.filename}`;
      const msg = await Message.create({
        group: groupId,
        sender: req.user.id,
        voiceUrl,
      });
      group.lastMessage = msg._id;
      await group.save();
      res.json(await msg.populate("sender", "name"));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

export default router;
