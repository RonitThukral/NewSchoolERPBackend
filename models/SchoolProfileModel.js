const mongoose = require("mongoose");

const { Schema } = mongoose;

// This schema is designed to hold a single document (or one per campus)
// that contains the school's core branding and contact information.
const SchoolProfileSchema = new Schema(
  {
    // --- Branding & Identity ---
    name: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
    },
    motto: {
      type: String,
    },
    logoUrl: {
      type: String,
    },
    photoUrl: {
      type: String,
    },

    // --- Contact Information ---
    address: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    telephone: {
      type: String,
      required: true,
    },

    // --- Relational Context ---
    campusID: {
      // If you have multiple campuses, you can have one profile per campus.
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      unique: true, // Ensures only one profile per campus
    },
  },
  { timestamps: true }
);

SchoolProfileSchema.index({ campusID: 1 });

module.exports = mongoose.model("schoolprofile", SchoolProfileSchema);