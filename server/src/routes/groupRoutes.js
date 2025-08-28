import express from "express";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Create a group
router.post("/", auth, async (req, res) => {
  try {
    const { name } = req.body;
    const group = await Group.create({
      name,
      owner: req.user.id,
      members: [{ user: req.user.id, role: "admin" }],
    });
    res.json(group);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// My groups
router.get("/", auth, async (req, res) => {
  const groups = await Group.find({ "members.user": req.user.id }).sort(
    "-updatedAt"
  );
  res.json(groups);
});

// Add member (admins only)
router.post("/:id/members", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.isAdmin(req.user.id))
      return res.status(403).json({ message: "Admins only" });
    const exists = group.members.some((m) => m.user.equals(userId));
    if (exists) return res.status(400).json({ message: "Already a member" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    group.members.push({ user: userId, role: "member" });
    await group.save();
    res.json(group);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Remove member (admins only)
router.delete("/:id/members/:userId", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.isAdmin(req.user.id))
      return res.status(403).json({ message: "Admins only" });
    group.members = group.members.filter(
      (m) => !m.user.equals(req.params.userId)
    );
    await group.save();
    res.json(group);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Promote to admin (owner only)
router.post("/:id/admins", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.owner.equals(req.user.id))
      return res.status(403).json({ message: "Owner only" });
    const member = group.members.find((m) => m.user.equals(userId));
    if (!member) return res.status(404).json({ message: "Member not found" });
    member.role = "admin";
    await group.save();
    res.json(group);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Demote admin (owner only)
router.delete("/:id/admins/:userId", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.owner.equals(req.user.id))
      return res.status(403).json({ message: "Owner only" });
    const member = group.members.find((m) => m.user.equals(req.params.userId));
    if (!member) return res.status(404).json({ message: "Member not found" });
    member.role = "member";
    await group.save();
    res.json(group);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
