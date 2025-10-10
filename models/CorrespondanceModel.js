const mongoose = require("mongoose");

const { Schema } = mongoose;

const CorrespondanceSchema = new Schema(
  {
    address: {
      type: String,
      required: true,
    },
    salutation: {
      type: String,
    },
    subject: {
      type: String,
      required: true,
    },
    name: {
      name: { type: String, required: true },
      surname: { type: String, required: true },
      father_name: { type: String, required: true },
      mother_name: { type: String, required: true },
      years: { type: String, default: "N/A" },
    },

    classID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
    },
    // closing: {
    //   type: String,
    // },
    // signature: {},
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("correspondance", CorrespondanceSchema);
