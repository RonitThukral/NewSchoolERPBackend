const mongoose = require("mongoose");
const { Schema } = mongoose;

const SchoolSchema = new Schema(
  {
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
      enum: ["admin", "super-admin"],
      default: "admin",
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      // campusID is only required if the role is 'admin'
      required: function () { return this.role === 'admin'; },
    },
  },
  { timestamps: true }
);

SchoolSchema.index({ campusID: 1 });

module.exports = mongoose.model("school", SchoolSchema);