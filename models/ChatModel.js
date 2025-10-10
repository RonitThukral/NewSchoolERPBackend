const mongoose = require("mongoose");

const { Schema } = mongoose;

// This sub-schema defines the structure of a single message
const MessageSchema = new Schema({
  senderID: {
    type: String, // The userID of the person who sent the message
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  isViewed: {
    type: Boolean,
    default: false,
  },
});

// This is the main schema for a conversation thread between two users
const ConversationSchema = new Schema(
  {
    // The two participants in the conversation
    requestor_id: {
      type: String,
      required: true,
    },
    acceptor_id: {
      type: String,
      required: true,
    },
    // An array containing all messages in this conversation
    messages: {
      type: [MessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("chats", ConversationSchema);
