const mongoose = require("mongoose");

const { Schema } = mongoose;

const DeductionsSchema = new Schema(
  {
    // --- What is this deduction/fine? ---
    name: {
      type: String,
      required: true, // e.g., "Late Submission Fine", "Salary Advance Deduction"
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String, // Optional detailed reason
    },
    date: {
      type: Date,
      required: true, // The date the fine/deduction was issued
    },

    // --- Who does this apply to? (Dynamic Reference) ---
    personType: {
      type: String,
      required: true,
      enum: ["students", "teachers"],
    },
    person: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "personType", // Points to either 'students' or 'teachers' collection
    },

    // --- Context & Status ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "waived"],
      default: "pending",
    },

    // --- Financial Link ---
    transactionID: {
      // Optional: Link to the transaction where this was paid/deducted
      type: mongoose.Schema.Types.ObjectId,
      ref: "transactions",
    },
  },
  { timestamps: true }
);

DeductionsSchema.index({ campusID: 1 });

module.exports = mongoose.model("deductions", DeductionsSchema);
