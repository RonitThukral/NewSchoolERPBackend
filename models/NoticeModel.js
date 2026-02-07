const mongoose = require("mongoose");

const { Schema } = mongoose;
const NoticeSchema = new Schema(
  {
    // --- Core Content ---
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },

    // --- Context & Relations ---
    createdBy: {
      // The admin/teacher who published the notice
      type: mongoose.Schema.Types.ObjectId,
      ref: "teachers",
      required: true,
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },

    // --- Audience Targeting ---
    // Defines who should see this notice.
    target: {
      roles: {
        type: [String],
        enum: ["student", "teacher", "all"],
        default: ["all"],
      },
      // If empty, applies to all classes within the targeted roles/campus.
      classes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "classes",
      }],
    },

    // --- Dates & Attachments ---
    publishDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: { // Optional: for notices that should disappear after a certain date
      type: Date,
    },
  },
  { timestamps: true }
);

NoticeSchema.index({ campusID: 1 });

module.exports = mongoose.model("notices", NoticeSchema);
