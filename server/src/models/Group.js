const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [memberSchema],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }, // quick preview
  },
  { timestamps: true }
);

groupSchema.methods.isAdmin = function (userId) {
  return this.members.some((m) => m.user.equals(userId) && m.role === "admin");
};

module.exports = mongoose.model("Group", groupSchema);
