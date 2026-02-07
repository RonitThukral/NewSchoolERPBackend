const mongoose = require("mongoose");

const { Schema } = mongoose;

// Sub-schema for Next of Kin for better structure and validation
const NextOfKinSchema = new Schema({
  relationship: { type: String },
  occupation: { type: String },
  name: { type: String, required: true },
  lastname: { type: String },
  email: { type: String, lowercase: true },
  mobile: { type: String, required: true },
  address: { type: String },
}, { _id: false }); // _id: false prevents Mongoose from creating an _id for this subdocument

const TeacherSchema = new Schema(
  {
    // --- Core Identifiers & Status ---
    userID: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "teacher",
    },
    isStaff: {
      type: Boolean,
      default: true,
    },
    employmentStatus: { // Renamed from 'withdraw'
      type: String,
      enum: ["active", "resigned", "terminated"],
      default: "active",
    },

    // --- Personal Information ---
    name: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
    },
    salutation: { // Renamed from 'title' for clarity (e.g., Mr., Mrs., Dr.)
      type: String,
    },
    gender: {
      type: String,
      required: true,
    },
    dateofBirth: {
      type: Date,
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
      unique: true,
      lowercase: true,
    },
    physicalAddress: {
      type: String,
    },
    postalAddress: {
      type: String,
    },
    telephone: {
      type: String,
    },
    mobilenumber: {
      type: String,
    },

    // --- Employment & Academic Details ---
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    employmentDate: {
      type: Date,
      default: Date.now,
    },
    qualifications: {
      type: String,
    },
    yearsOfExperience: { // Renamed from 'years'
      type: String,
    },
    position: {
      type: String,
    },

    // --- Financial Information ---
    bank: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    salary: {
      type: String,
    },
    allowance: {
      type: String,
    },
    ssnit: {
      type: Boolean,
      default: false,
    },
    taxNumber: {
      type: String,
    },

    // --- Next of Kin & Health ---
    nextofKin: NextOfKinSchema,
    healthInfo: { // Grouped health fields
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

TeacherSchema.index({ campusID: 1 });

module.exports = mongoose.model("teachers", TeacherSchema);
