const mongoose = require("mongoose");

const { Schema } = mongoose;

const ImageSchema = new Schema(
  {
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("images", ImageSchema);
