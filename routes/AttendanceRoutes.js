const express = require("express");
const {
  getAllAttendance,
  getAttendanceByUser,
  getAttendanceByClassAndDate,
  createOrUpdateStudentAttendance,
  createOrUpdateStaffAttendance, // New controller for staff
} = require("../controllers/attendanceController");
const ClassesModel = require("../models/ClassesModel");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

const classTeacherCheckOptions = {
  ownershipCheck: async (req) => {
    // Any admin (Global or Campus) can perform the action
    if (req.user.role === 'admin') return true;
    if (req.user.role === 'teacher') {
      const classId = req.body.classID || req.params.classID;
      if (!classId) return false; // No class ID provided to check against
      const classDoc = await ClassesModel.findById(classId).select('teacherID').lean();
      // Allow if the teacher is the designated class teacher
      return classDoc && classDoc.teacherID && classDoc.teacherID.toString() === req.user._id.toString();
    }
    return false; // Deny by default
  }
};

// Get all attendance records (Admin)
route.get("/", protect, authorize("admin"), getAllAttendance); // No change needed, but confirms logic

// Get a specific user's attendance history (Student/Teacher/Parent Portal) - CORRECTED
route.get("/user/:id", protect, authorize("admin", "teacher", "student", {
  ownershipCheck: (req) => {
    if (req.user.role === 'admin') return true;
    // Students and Teachers can only get their own attendance
    return req.user._id.toString() === req.params.id;
  }
}), getAttendanceByUser);

// Get or create a new attendance sheet for a specific class and date (Teacher/Admin Portal)
route.get("/class/:classID/:date", protect, authorize("admin", "teacher", classTeacherCheckOptions), getAttendanceByClassAndDate);

// Create or update STUDENT attendance for a class (Class Teacher & Admin Portal)
route.post("/students",
  protect,
  authorize("admin", "teacher", classTeacherCheckOptions),
  createOrUpdateStudentAttendance
);

// Create or update STAFF attendance for a campus (Admin Portal ONLY)
route.post("/staff", protect, authorize("admin"), createOrUpdateStaffAttendance);

module.exports = route;
