const { Message } = require("../models/Message");
const { Group } = require("../models/Group");

// ✅ Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { type, text, mediaUrl } = req.body;

    const message = await Message.create({
      group: groupId,
      sender: req.user._id,
      type,
      text,
      mediaUrl,
    });

    // update group's lastMessage
    await Group.findByIdAndUpdate(groupId, { lastMessage: message._id });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get messages of a group
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const messages = await Message.find({ group: groupId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 }); // oldest → newest

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Mark message as read
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (!message.readBy.includes(req.user._id)) {
      message.readBy.push(req.user._id);
      await message.save();
    }

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete a message (only sender or admin)
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId).populate("group");
    if (!message) return res.status(404).json({ error: "Message not found" });

    const isAdmin = message.group.isAdmin(req.user._id);

    if (!message.sender.equals(req.user._id) && !isAdmin)
      return res.status(403).json({ error: "Not allowed" });

    await message.deleteOne();
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
