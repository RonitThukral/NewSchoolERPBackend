const mongoose = require("mongoose");

const { Schema } = mongoose;

// A generic sub-schema for an individual's attendance status (can be student or teacher)
const AttendeeSchema = new Schema(
  {
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // Dynamically references the collection specified in the 'attendeeType' path
      refPath: "attendeeType",
    },
    status: {
      type: String,
      required: true,
      enum: ["present", "absent", "late", "leave", "half-day"],
      default: "present", // Defaulting to 'present' is often more convenient
    },
    remarks: {
      // Optional field for notes, e.g., "Left early"
      type: String,
    },
  },
  { _id: false }
);

const AttendanceSchema = new Schema(
  {
    // --- Context ---
    attendeeType: {
      type: String,
      required: true,
      enum: ["students", "teachers"],
      // This field is used by refPath in AttendeeSchema
    },
    classID: {
      // Required for 'students' attendance, optional for 'teachers'
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
      required: function () {
        return this.attendeeType === "students";
      },
    },
    campusID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "campus",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      required: true,
    },

    // --- Records ---
    attendees: {
      type: [AttendeeSchema],
      default: [],
    },

    // --- Meta ---
    recordedBy: {
      // The user who took the attendance
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recordedByType",
    },
    recordedByType: {
      type: String,
      required: true,
      enum: ["teachers", "nonteachers"],
    },
  },
  { timestamps: true }
);

// Create a compound index to ensure only one attendance record per class per day
// For teachers, classID will be null, and this index will enforce uniqueness
// for one staff attendance sheet per day (where classID is null).
AttendanceSchema.index({ classID: 1, date: 1 }, { unique: true });

AttendanceSchema.index({ campusID: 1 });

module.exports = mongoose.model("attendance", AttendanceSchema);
