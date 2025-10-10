const mongoose = require("mongoose");

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    // --- Who is this notification for? (Dynamic Reference) ---
    recipientType: {
      type: String,
      required: true,
      enum: ["students", "teachers"],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientType", // Points to 'students' or 'teachers' collection
    },

    // --- Notification Content (matches Expo payload) ---
    title: {
      type: String,
      required: true,
    },
    body: { // The main message content
      type: String,
      required: true,
    },
    data: { // Optional data payload for in-app navigation
      type: Object,
    },

    // --- Status & Delivery Tracking ---
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "read"],
      default: "pending",
    },
    readAt: {
      type: Date,
    },
    deliveryPlatform: {
      type: String,
      enum: ["expo", "web", "in-app"],
      required: true,
    },
    deliveryResponse: { // To log the response from the push service (e.g., Expo's ticket ID)
      type: Object,
    },
    errorMessage: { // To log any errors during sending
      type: String,
    },

    // --- Context (What triggered this notification?) ---
    // Optional references to link the notification to its source
    noticeID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "notices",
    },
    homeworkID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "homeworks",
    },
    deductionID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "deductions",
    },
    leaveApplicationID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "leaveapplication",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("notifications", NotificationSchema);
