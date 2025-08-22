const { Group } = require("../models/Group");
const { Message } = require("../models/Message");

// ✅ Create a group
exports.createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;

    const group = await Group.create({
      name,
      owner: req.user._id, // assuming auth middleware sets req.user
      members: [
        { user: req.user._id, role: "admin" }, // owner is admin
        ...(members || []),
      ],
    });

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Add a member to group
exports.addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (!group.isAdmin(req.user._id))
      return res.status(403).json({ error: "Only admins can add members" });

    group.members.push({ user: userId, role: "member" });
    await group.save();

    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get all groups for a user
exports.getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({ "members.user": req.user._id })
      .populate("owner", "name email")
      .populate("lastMessage");

    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete group (only owner)
exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (!group.owner.equals(req.user._id))
      return res.status(403).json({ error: "Only owner can delete group" });

    await group.deleteOne();
    res.json({ message: "Group deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
