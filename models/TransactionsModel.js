const mongoose = require("mongoose");

const { Schema } = mongoose;

const TransactionSchema = new Schema(
  {
    // --- Core Financials ---
    amount: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number, // This amount is often derived from a student's scholarship
      default: 0,
    },
    netAmount: { // This would typically be (amount - discount)
      type: Number,
      required: true,
    },

    // --- Transaction Classification ---
    category: {
      type: String,
      required: true, // e.g., 'fees', 'payroll', 'transport', 'canteen', 'store_sale'
    },
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense'],
    },
    description: {
      type: String,
    },

    // --- Relational IDs ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    studentID: { // For student-related transactions like fees
      type: mongoose.Schema.Types.ObjectId,
      ref: "students",
    },
    teacherID: { // For teacher-related transactions like payroll
      type: mongoose.Schema.Types.ObjectId,
      ref: "teachers",
    },
    scholarshipID: { // If a discount is applied from a scholarship, this links to it for auditing
      type: mongoose.Schema.Types.ObjectId,
      ref: "scholarships",
    },
    // An array of deduction/fine IDs that this transaction covers.
    deductionsPaid: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "deductions",
    }],
    inventorySaleID: { // For store/canteen sales
      type: mongoose.Schema.Types.ObjectId,
      ref: "storesales",
    },

    // --- Payment Details ---
    paymentMethod: {
      type: String,
      // Added 'online_gateway' for future payment gateway integration
      enum: ['cash', 'cheque', 'bank_transfer', 'mobile_money', 'online_gateway', 'upi'],
    },
    chequeNumber: {
      type: String,
    },
    bankAccountID: {
      // The specific school bank account this transaction is associated with
      type: mongoose.Schema.Types.ObjectId,
      ref: "banking",
    },
    transactionDate: { // The actual date the transaction occurred
      type: Date,
      default: Date.now,
    },

    // --- Period Information ---
    academicYear: {
      type: String,
    },
    term: {
      type: String,
    },
    month: { // For monthly things like payroll
      type: String,
    },

    // --- Online Payment Tracking ---
    merchantTransactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    status: {
      type: String, // PENDING, SUCCESS, FAILED
      default: 'SUCCESS', // Default to SUCCESS for manual entries
    },
    phonepeTransactionId: {
      type: String,
    },
    phonepeData: {
      type: Object,
    },
    callbackData: {
      type: Object,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    // This transform cleans up the data before it's sent in an API response
    toJSON: {
      transform: function (doc, ret) {
        // Remove the __v field from all responses
        delete ret.__v;

        // Remove any field that has a null or undefined value
        Object.keys(ret).forEach(key => {
          if (ret[key] === null || ret[key] === undefined) {
            delete ret[key];
          }
        });
        return ret;
      }
    }
  }
);

TransactionSchema.index({ campusID: 1 });

module.exports = mongoose.model("transactions", TransactionSchema);
