const mongoose = require("mongoose");

const { Schema } = mongoose;

// Sub-schema for individual student scores
const StudentScoreSchema = new Schema({
  studentID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "students",
    required: true,
  },
  classWorkScore: { type: Number, default: 0 },
  examScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 }, // Calculated field (classWork + exam)
  grade: { type: String }, // e.g., "A", "B+", "Pass"
  position: { type: String }, // e.g., "1st", "2nd"
  remarks: { type: String }, // e.g., "Excellent", "Needs Improvement"
}, { _id: false });

const SBASchema = new Schema(
  {
    // --- Context & Relations ---
    classID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
      required: true,
    },
    courseID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      required: true,
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },

    // --- Assessment Structure ---
    // Defines the maximum marks and weighting for this assessment
    maxClassWorkScore: {
      type: Number, // e.g., 30
      default: 30,
    },
    maxExamScore: {
      type: Number, // e.g., 70
      default: 70,
    },
    classWorkWeight: {
      type: Number, // e.g., 30 for 30%
      default: 30,
    },
    examWeight: {
      type: Number, // e.g., 70 for 70%
      default: 70,
    },

    // --- Student Records ---
    scores: {
      type: [StudentScoreSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Mongoose pre-save hook to automatically calculate the total score for each student
SBASchema.pre('save', function (next) {
  // 'this' refers to the document being saved
  if (this.isModified('scores')) {
    this.scores.forEach(score => {
      score.totalScore = (score.classWorkScore || 0) + (score.examScore || 0);
    });
  }
  next();
});

// Ensure only one SBA record per class, per course, per term
SBASchema.index({ classID: 1, courseID: 1, academicYear: 1, term: 1 }, { unique: true });

SBASchema.index({ campusID: 1 });

module.exports = mongoose.model("sba", SBASchema);
