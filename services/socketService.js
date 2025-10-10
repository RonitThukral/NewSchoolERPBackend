const ChatModel = require("../models/ChatModel");

const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // User joins a room based on their own userID
    socket.on("join", (userID) => {
      console.log(`${userID} joined their room.`);
      socket.join(userID);
    });

    // Handle sending a new message
    socket.on("sendMessage", async (data) => {
      const { senderID, recipientID, message } = data;

      if (!senderID || !recipientID || !message) {
        // Optionally, emit an error back to the sender
        socket.emit("chatError", { error: "Missing data for sending message." });
        return;
      }

      try {
        // Find the conversation between the two users
        let conversation = await ChatModel.findOne({
          $or: [
            { requestor_id: senderID, acceptor_id: recipientID },
            { requestor_id: recipientID, acceptor_id: senderID },
          ],
        });

        // If no conversation exists, create one
        if (!conversation) {
          conversation = await ChatModel.create({
            requestor_id: senderID,
            acceptor_id: recipientID,
            messages: [],
          });
        }

        // Prepare the new message
        const newMessage = {
          senderID: senderID,
          message: message,
          date: new Date(),
        };

        // Add the new message to the conversation's messages array
        conversation.messages.push(newMessage);
        await conversation.save();

        // Emit the message to the recipient's room
        // The recipient will be listening on an event, e.g., "receiveMessage"
        io.to(recipientID).emit("receiveMessage", newMessage);

        // You can also emit back to the sender to confirm the message was sent
        socket.emit("messageSent", newMessage);

      } catch (error) {
        console.error("Error handling chat message:", error);
        socket.emit("chatError", { error: "Server error while sending message." });
      }
    });

    // Listen for when a user has seen messages in a conversation
    socket.on("markAsSeen", async ({ conversationID, userID }) => {
      try {
        // Update all messages in the conversation that were not sent by the current user
        // and are not already marked as viewed. This is efficient.
        await ChatModel.updateOne(
          { _id: conversationID },
          { $set: { "messages.$[elem].isViewed": true } },
          { arrayFilters: [{ "elem.senderID": { $ne: userID }, "elem.isViewed": false }] }
        );

        // Find the conversation to identify the other participant
        const conversation = await ChatModel.findById(conversationID);
        if (conversation) {
          const otherUserID = conversation.requestor_id === userID
            ? conversation.acceptor_id
            : conversation.requestor_id;

          // Notify the other user that their messages have been seen
          io.to(otherUserID).emit("messagesSeen", { conversationID });
        }
      } catch (error) {
        console.error("Error marking messages as seen:", error);
        socket.emit("chatError", { error: "Server error while marking messages as seen." });
      }
    });

    // Listen for when a user starts typing
    socket.on("typing", ({ senderID, recipientID }) => {
      // Forward this event to the recipient so they can show the indicator
      io.to(recipientID).emit("userTyping", { senderID });
    });

    // Listen for when a user stops typing
    socket.on("stopTyping", ({ senderID, recipientID }) => {
      // Forward this event to the recipient to hide the indicator
      io.to(recipientID).emit("userStopTyping", { senderID });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = initializeSocket;