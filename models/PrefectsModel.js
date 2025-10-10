const mongoose = require("mongoose");

const { Schema } = mongoose;

const PrefectsSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    position: {
      type: String,
    },
    userID: {
      type: String,
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    startYear: {
      type: String,
    },
    endYear: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("prefects", PrefectsSchema);
