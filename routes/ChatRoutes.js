const express = require("express");
const {
  getConversations,
  getChatHistory,
} = require("../controllers/chatController");
const { protect } = require("../middlewares/auth");

const route = express.Router();

// Get all conversation threads for a user (for the chat list)
route.get("/conversations/:userID", protect, getConversations);

// Get the full message history for a specific conversation
route.get("/history/:conversationID", protect, getChatHistory);

module.exports = route;
