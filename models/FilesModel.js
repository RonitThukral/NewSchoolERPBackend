const mongoose = require("mongoose");

const { Schema } = mongoose;

const FilesSchema = new Schema(
  {
    topic: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
    },
    courseID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
    },
    classID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
    },
    senderID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teachers",
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
    },
    file: {
      type: String,
    },
  },
  { timestamps: true }
);

FilesSchema.index({ campusID: 1 });

module.exports = mongoose.model("notes", FilesSchema);
