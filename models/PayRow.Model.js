const mongoose = require("mongoose");

const { Schema } = mongoose;

// This schema defines a salary structure or pay grade for a specific role.
const PayrollSchema = new Schema(
  {
    // --- Identification ---
    name: {
      type: String, // e.g., "Senior Teacher Grade 1", "Junior Staff"
      required: true,
    },
    code: {
      type: String,
      // unique: true, // Removed global uniqueness
    },

    // --- Salary Components ---
    basicSalary: {
      type: Number,
      required: true,
    },
    medicalAllowance: {
      type: Number,
      default: 0,
    },
    transportAllowance: {
      type: Number,
      default: 0,
    },
    housingAllowance: {
      type: Number,
      default: 0,
    },
    cpfContribution: { // Employer CPF Contribution
      type: Number,
      default: 0,
    },
    bonus: { // Performance Bonus
      type: Number,
      default: 0,
    },

    // --- ERP Context ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure code is unique per campus, but can be repeated across campuses
PayrollSchema.index({ code: 1, campusID: 1 }, { unique: true });
PayrollSchema.index({ campusID: 1 });

module.exports = mongoose.model("payroll", PayrollSchema);
