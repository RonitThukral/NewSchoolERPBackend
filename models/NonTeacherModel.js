const mongoose = require("mongoose");

const { Schema } = mongoose;

const NonTeacherSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      // Allows multiple documents to have a null email, but email addresses must be unique
      sparse: true,
    },
    address: {
      type: String,
    },
    role: {
      type: String,
    },
    telephone: {
      type: String,
    },
    position: {
      type: String,
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
    },
    password: {
      type: String,
      required: true,
    },
    nextofKin_ID: {
      type: String,
    },
    gender: {
      type: String,
    },
    profileUrl: String,
    userID: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// This is the modern way to create a unique index that ignores null/missing values.
NonTeacherSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });

NonTeacherSchema.index({ campusID: 1 });

module.exports = mongoose.model("nonTeachers", NonTeacherSchema, "accounts");
