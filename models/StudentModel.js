const mongoose = require("mongoose");

const { Schema } = mongoose;

// Sub-schema for Guardian for better structure and validation
const GuardianSchema = new Schema({
  name: { type: String, required: true },
  lastname: String,
  email: { type: String, lowercase: true },
  mobile: { type: String, required: true },
  address: String,
  relationship: String,
  occupation: String,
}); // By removing {_id: false}, Mongoose will automatically add a unique _id to each guardian

// Sub-schema for tracking a student's class history
const ClassHistorySchema = new Schema({
  classID: { type: mongoose.Schema.Types.ObjectId, ref: "classes", required: true },
  academicYear: { type: String, required: true },
  status: {
    type: String,
    enum: ["enrolled", "promoted", "repeated", "graduated"],
    required: true,
  },
}, { _id: false, timestamps: true }); // Timestamps will show when they were moved to this class


const StudentSchema = new Schema(
  {
    // --- Core Identifiers & Status ---
    userID: {
      type: String,
      required: true,
      unique: true, // Ensures every student has a unique ID
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "student",
    },
    enrollmentStatus: {
      type: String,
      enum: ["active", "withdrawn", "graduated"],
      default: "active",
    },
    statusChangeDate: {
      type: Date,
    },

    // --- Personal Information ---
    name: {
      type: String,
      required: true, // A student must have a name
    },
    surname: {
      type: String,
      required: true, // A student must have a surname
    },
    middleName: {
      type: String,
    },
    dateofBirth: {
      type: Date,
    },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"], // Standardized to lowercase
    },
    placeOfBirth: {
      type: String,
    },
    nationality: {
      type: String,
    },
    religion: {
      type: String,
    },

    // --- Contact Information ---
    email: {
      type: String,
      unique: true, // Ensures email is unique across all students
      lowercase: true, // Stores email in lowercase to prevent case-sensitive duplicates
    },
    mobilenumber: {
      type: String,
    },
    whatsappnumber: {
      type: String,
    },
    physicalAddress: {
      type: String,
    },
    postalAddress: {
      type: String,
    },

    // --- Academic Information ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus"
    },
    classID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes"
    },
    grade: {
      type: String,
    },
    designations: {
      type: [String],
      default: [],
    },
    scholarship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "scholarships",
    },
    fees: {
      type: String,
    },
    // --- Academic History ---
    classHistory: {
      type: [ClassHistorySchema],
      default: [],
    },

    // --- Guardian Information ---
    guardian: {
      type: [GuardianSchema], // Using the structured sub-schema
      validate: [
        (val) => val.length <= 3,
        "A student cannot have more than 3 guardians.",
      ],
    },

    // --- Achievements ---
    earnedBadges: [
      {
        badge: { type: mongoose.Schema.Types.ObjectId, ref: 'badges' },
        earnedAt: { type: Date, default: Date.now },
        _id: false
      }
    ],

    // --- Health & History ---
    lastSchool: {
      type: {
        school: String,
        reason: String,
      },
    },
    // Grouping health information for better organization
    healthInfo: {
      allergies: { type: String }, // Corrected typo from 'allege'
      medicalConditions: { type: String }, // More descriptive than 'disease'
      notes: { type: String }, // General health notes, formerly 'health'
    },

    // --- System & Meta Fields ---
    profileUrl: {
      type: String,
    },
    lastLogin: {
      type: Date,
    },
    resetPassowrdToken: String,
    resetPasswordExpires: Date,
    // Stores push notification tokens for different devices/platforms
    pushTokens: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

StudentSchema.index({ campusID: 1 });

module.exports = mongoose.model("students", StudentSchema);
