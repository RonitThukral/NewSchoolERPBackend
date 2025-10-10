const mongoose = require("mongoose");

const { Schema } = mongoose;

const BankingSchema = new Schema(
  {
    // --- Account Details ---
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true, // Each account number should be unique
    },
    branch: {
      type: String,
    },
    accountType: {
      type: String,
      enum: ["checking", "savings", "loan", "other"],
      default: "checking",
    },

    // --- Relational & Status ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true, // Must be linked to a campus
    },
    isDefault: {
      // To mark a primary account for transactions
      type: Boolean,
      default: false,
    },
    isActive: {
      // To enable/disable an account
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// To ensure only one default account per campus
BankingSchema.index({ campusID: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

module.exports = mongoose.model("banking", BankingSchema);
