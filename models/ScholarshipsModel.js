const mongoose = require("mongoose");

const { Schema } = mongoose;

const ScholarshipsSchema = new Schema(
  {
    // --- Core Details ---
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // Standardize codes to uppercase
    },
    description: {
      type: String,
    },

    // --- Discount Details ---
    discountType: {
      type: String,
      required: true,
      enum: ["percentage", "fixed_amount"], // Can be a percentage or a fixed amount
    },
    discountValue: {
      type: Number,
      required: true, // The actual percentage (e.g., 50) or fixed amount (e.g., 500)
    },

    // --- Applicability ---
    // Optional: To which fee categories does this apply? e.g., ['fees', 'transport']
    // If empty, it can be assumed to apply to the total bill.
    applicableCategories: {
      type: [String],
      default: [],
    },

    // --- ERP Context & Status ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    isActive: {
      // To enable/disable a scholarship without deleting it
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ScholarshipsSchema.index({ campusID: 1 });

module.exports = mongoose.model("scholarships", ScholarshipsSchema);
