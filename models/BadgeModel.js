const mongoose = require("mongoose");

const { Schema } = mongoose;

const BadgeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // e.g., "Quiz Whiz", "Perfect Score!"
    },
    description: {
      type: String,
      required: true, // e.g., "Awarded for scoring 90% or higher on a quiz."
    },
    iconUrl: {
      type: String, // URL to the badge image
      required: true,
    },
    // --- How to earn this badge ---
    criteria: {
      type: {
        type: String,
        enum: ["quiz_score_percentage"], // We can add more types later (e.g., 'attendance_streak')
        required: true,
      },
      value: {
        type: Number, // e.g., 90 (for 90%)
        required: true,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("badges", BadgeSchema);