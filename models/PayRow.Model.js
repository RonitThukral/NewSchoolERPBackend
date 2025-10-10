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
      unique: true, // A unique code for this pay grade, e.g., "ST-G1"
    },

    // --- Salary Components ---
    basicSalary: {
      type: Number,
      required: true,
    },
    allowance: {
      type: Number,
      default: 0,
    },
    bonus: {
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

module.exports = mongoose.model("payroll", PayrollSchema);
