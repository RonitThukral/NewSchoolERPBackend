const mongoose = require("mongoose");

const { Schema } = mongoose;

// Sub-schema for individual fee components (e.g., Tuition, Exam Fee)
const FeeItemSchema = new Schema({
  name: {
    type: String,
    required: true, // e.g., 'Tuition Fee', 'Maintenance Fee'
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
}, { _id: false });

const FeesSchema = new Schema(
  {
    // --- Classification & Identification ---
    name: {
      type: String,
      required: true, // e.g., "Grade 1 Fees 2024-2025"
    },
    academicYear: {
      type: String,
      required: true,
    },
    term: {
      type: String, // e.g., 'Term 1', 'Term 2'
    },

    // --- Relational IDs ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    // An array of class IDs this fee structure applies to
    applicableClasses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
    }],

    // --- Fee Breakdown ---
    // An array of individual fee items, making the structure flexible
    feeItems: {
      type: [FeeItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

FeesSchema.index({ campusID: 1 });

module.exports = mongoose.model("fees", FeesSchema);
