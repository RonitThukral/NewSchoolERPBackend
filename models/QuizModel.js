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
      required: true,
      default: "none",
    },
    courseID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
      required: true,
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
    totalTime:{
      type: Number,
      required: true,
      default: 10.0
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
          type: {
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
            takeTime:{
              type: Number,
              default: 0.0
            }
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("quiz", QuizSchema);
