// const UserSchema = require("../Models/user");
const express = require("express");
const { v4 } = require("uuid");
const { authenticateToken } = require("../Helper/authenticateToken");
const router = express.Router();
const ConversationSchema = require("../Models/conversation");
const UserSchema = require("../Models/user");

// New Conversation
router.post("/", authenticateToken, async (req, res) => {
  const { UID } = req.user;
  const { senderId, receiverId } = req.body;
  if (!senderId || !receiverId)
    return res
      .status(400)
      .json({ type: "error", message: "Sender ID or Receiver ID not found" });
  if (senderId !== UID)
    return res
      .status(400)
      .json({ type: "error", message: "Invalid Sender ID" });

  // Check if conversation already exists
  const checkConversation = await ConversationSchema.findOne({
    members: { $all: [senderId, receiverId] },
  });
  if (checkConversation)
    return res.status(200).json({ type: "success", status: "chat exists" });
  const newConversation = new ConversationSchema({
    members: [senderId, receiverId],
    conversationId: v4(),
  });
  try {
    const savedConversation = await newConversation.save();
    res.status(200).json({
      type: "success",
      message: "You started a chat!",
      status: "chat started",
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get Conversation of a user
router.get("/", authenticateToken, async (req, res) => {
  const { UID } = req.user;
  try {
    const conversation = await ConversationSchema.find({
      members: { $in: [UID] },
    });
    res.status(200).json(conversation);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get specific user info
router.get("/find/:userId", authenticateToken, async (req, res) => {
  const { userId } = req.params;
  if (!userId)
    return res.status(400).json({ type: "error", message: "Invalid User ID" });
  try {
    const user = await UserSchema.findOne({ UID: userId });
    const { displayName, username, role } = user;
    res.status(200).json({ username, displayName, role });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
