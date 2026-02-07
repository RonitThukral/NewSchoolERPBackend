const mongoose = require("mongoose");

const { Schema } = mongoose;

// Sub-schema for attachments (e.g., doctor's note)
const AttachmentSchema = new Schema({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String }, // e.g., 'pdf', 'image'
}, { _id: false });

const LeaveApplicationSchema = new Schema(
  {
    // --- Who is applying? (Dynamic Reference) ---
    applicantType: {
      type: String,
      required: true,
      enum: ["students", "teachers"],
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "applicantType", // Points to 'students' or 'teachers' collection
    },

    // --- Leave Details ---
    reason: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },

    // --- Status & Review ---
    status: {
      type: String,
      default: "pending",
      enum: ["approved", "pending", "rejected"],
    },
    rejectionReason: { // Reason if the status is 'rejected'
      type: String,
    },
    reviewedBy: { // The admin/teacher who reviewed the application
      type: mongoose.Schema.Types.ObjectId,
      ref: "teachers",
    },
    reviewDate: {
      type: Date,
    },

    // --- Supporting Documents ---
    attachments: {
      type: [AttachmentSchema],
      default: [],
    },

    // --- ERP Context ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

LeaveApplicationSchema.index({ campusID: 1 });

module.exports = mongoose.model("leaveapplication", LeaveApplicationSchema);
