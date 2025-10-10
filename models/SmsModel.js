const mongoose = require("mongoose");

const { Schema } = mongoose;

const SmsSchema = new Schema(
  {
    type:{
      type: String,
    },
    to: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("sms-counter", SmsSchema);
