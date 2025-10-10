const mongoose = require("mongoose");

const { Schema } = mongoose;

// Sub-schema for resource links (e.g., YouTube videos, articles)
const ResourceLinkSchema = new Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
}, { _id: false });

// Sub-schema for attached files (e.g., PDFs, images)
const AttachmentSchema = new Schema({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String }, // e.g., 'pdf', 'image', 'docx'
}, { _id: false });

const HomeWorkSchema = new Schema(
  {
    // --- Core Details ---
    title: { type: String, required: true },
    description: { type: String, required: true }, // Instructions for the homework

    // --- Context & Relations ---
    classID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
      required: true,
    },
    courseID: { // Replaces 'subject' for a more robust link
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
      required: true,
    },
    teacherID: { // The teacher who assigned the homework
      type: mongoose.Schema.Types.ObjectId,
      ref: "teachers",
      required: true,
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    academicYear: { type: String, required: true },

    // --- Dates ---
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },

    // --- Content & Submissions ---
    resourceLinks: [ResourceLinkSchema], // Array of links
    attachments: [AttachmentSchema], // Array of attached files from the teacher
  },
  { timestamps: true }
);

module.exports = mongoose.model("homeworks", HomeWorkSchema);
