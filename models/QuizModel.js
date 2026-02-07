const mongoose = require("mongoose");

const { Schema } = mongoose;

const QuizSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "none",
    },
    courseID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
      required: false, // Make it optional
    },
    classID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
      required: true,
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    duration: { // Renamed from totalTime to duration
      type: Number,
      required: true,
      default: 60
    },
    totalMarks: { // Added
      type: Number,
      default: 100
    },
    questions: {
      type: [
        {
          question: {
            type: String,
            required: true,
          },
          options: {
            type: [
              {
                type: String,
                required: true,
              },
            ],
            required: true,
          },
          answer: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    participants: {
      type: [
        {
          userID: {
            type: String,
            required: true,
          },
          score: {
            type: Number,
            default: 0,
          },
          date: {
            type: Date,
            default: Date.now,
          },
          takeTime: {
            type: Number,
            default: 0.0,
          },
          answers: {
            type: [String],
            default: [],
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

QuizSchema.index({ campusID: 1 });

// Note: In multi-tenant, we actually export the schema, but keeping the model export for compatibility with non-tenant usage if any.
module.exports = mongoose.model("quiz", QuizSchema);
