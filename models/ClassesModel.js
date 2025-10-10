const mongoose = require("mongoose");

const { Schema } = mongoose;

const ClassesSchema = new Schema(
  {
    // --- Core Information ---
    name: {
      type: String,
      required: true,
    },
    classCode: {
      type: String,
      required: true,
      unique: true, // Ensures every class has a unique code
      trim: true,   // Removes whitespace from the beginning and end
    },

    academicYear: { // The academic year this class instance is for (e.g., "2024-2025")
      type: String,
      required: true,
    },

    // --- Relational IDs (References) ---
    teacherID: { // The main class teacher
      type: mongoose.Schema.Types.ObjectId,
      ref: "teachers",
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true, // A class must belong to a campus
    },
    prefect: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "students", // Reference to the student who is the prefect
    },

    // --- Status ---
    isArchived: { // Renamed from 'past' for clarity
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("classes", ClassesSchema);
