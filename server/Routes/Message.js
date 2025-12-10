const express = require("express");
const { authenticateToken } = require("../Helper/authenticateToken");
const router = express.Router();
const MessageSchema = require("../Models/message");
const ConversationSchema = require("../Models/conversation");

// New Message
router.post("/", authenticateToken, async (req, res) => {
  const { UID } = req.user;
  const { conversationId, text } = req.body;
  const newMessage = new MessageSchema({ senderId: UID, text, conversationId });
  try {
    await newMessage.save();
    res.status(200).json({ status: "success" });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/:conversationId", authenticateToken, async (req, res) => {
  const { UID } = req.user;
  const { conversationId } = req.params;
  // Check that the conversation exists
  const checkConversation = await ConversationSchema.findOne({ conversationId, members: { $in: [UID] } });
  if (!checkConversation) return res.status(400).json({ type: "error", message: "Conversation not found / Unauthorised" });
  try {
    const messages = await MessageSchema.find({ conversationId });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
