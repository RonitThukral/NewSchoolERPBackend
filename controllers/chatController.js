const ChatModel = require("../models/ChatModel.js");

/**
 * Get all conversation threads for a specific user.
 * This is for building the user's chat list/inbox.
 */
exports.getConversations = async (req, res) => {
  try {
    const userID = req.params.userID;
    if (!userID) {
      return res.status(400).json({ success: false, error: "User ID is required." });
    }

    const conversations = await ChatModel.find({
      $or: [{ requestor_id: userID }, { acceptor_id: userID }],
    }).sort({ updatedAt: -1 }); // Sort by most recent activity

    res.json({ success: true, conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ success: false, error: "Server error while fetching conversations." });
  }
};

/**
 * Get the full message history for a single conversation.
 */
exports.getChatHistory = async (req, res) => {
  try {
    const conversationID = req.params.conversationID;
    if (!conversationID) {
      return res.status(400).json({ success: false, error: "Conversation ID is required." });
    }

    const conversation = await ChatModel.findById(conversationID);

    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found." });
    }

    res.json({ success: true, messages: conversation.messages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ success: false, error: "Server error while fetching chat history." });
  }
};