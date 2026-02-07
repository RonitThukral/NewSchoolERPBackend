const mongoose = require("mongoose");

const { Schema } = mongoose;

// This schema defines an item available for sale in the school store.
const StoreItemSchema = new Schema(
  {
    // --- Core Item Details ---
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: { // Stock Keeping Unit
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String, // e.g., 'Uniform', 'Book', 'Stationery'
      required: true,
    },
    description: {
      type: String,
    },

    // --- Pricing & Stock ---
    costPrice: { // How much the school paid for the item
      type: Number,
      default: 0,
    },
    sellingPrice: { // How much the school sells the item for
      type: Number,
      required: true,
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
    lowStockThreshold: { // For low stock alerts
      type: Number,
      default: 5,
    },

    // --- ERP Context & Status ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

StoreItemSchema.index({ campusID: 1 });

module.exports = mongoose.model("storeitems", StoreItemSchema);
