const mongoose = require("mongoose");

const { Schema } = mongoose;

// Sub-schema for assigning a course to a specific class with a specific teacher
const CourseClassAssignmentSchema = new Schema({
  classID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "classes",
    required: true,
  },
  teacherID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "teachers",
    required: true,
  },
});

const CourseSchema = new Schema(
  {
    // --- Core Information ---
    name: {
      type: String,
      required: true,
      trim: true,
    },
    courseCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: { // e.g., "Core", "Elective"
      type: String,
    },

    // --- Relational IDs ---
    // --- Class Assignments ---
    // An array showing which teacher teaches this course in which class
    classAssignments: {
      type: [CourseClassAssignmentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("courses", CourseSchema);
