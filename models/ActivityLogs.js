const mongoose = require("mongoose");

const { Schema } = mongoose;

const ActivitySchema = new Schema(
  {
    activity: {
      type: String,
    },
    user: {
      type: String,
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ativity", ActivitySchema);
