const mongoose = require("mongoose");

const { Schema } = mongoose;

// Sub-schema for items included in a sale
const SoldItemSchema = new Schema({
  itemID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "storeitems",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  priceAtSale: { // The price of the item at the time of sale
    type: Number,
    required: true,
  },
  totalAmount: { // quantity * priceAtSale
    type: Number,
    required: true,
  },
}, { _id: false });

const StoreSalesSchema = new Schema(
  {
    // --- Who was involved? ---
    customer: { // The student or teacher who made the purchase
      type: mongoose.Schema.Types.ObjectId,
      refPath: "customerType",
    },
    customerType: {
      type: String,
      enum: ["students", "teachers", "other"], // 'other' for cash sales to unknown persons
    },
    soldBy: { // The staff member who processed the sale
      type: mongoose.Schema.Types.ObjectId,
      ref: "teachers",
      required: true,
    },

    // --- What was sold? ---
    items: [SoldItemSchema],

    // --- Financial Summary ---
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, required: true },
    balance: { type: Number, default: 0 }, // totalAmount - amountPaid

    // --- ERP Context ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    transactionID: { // Direct link to the master transaction log
      type: mongoose.Schema.Types.ObjectId,
      ref: "transactions",
      required: true,
    },
  },
  { timestamps: true }
);

StoreSalesSchema.index({ campusID: 1 });

module.exports = mongoose.model("storesales", StoreSalesSchema);
