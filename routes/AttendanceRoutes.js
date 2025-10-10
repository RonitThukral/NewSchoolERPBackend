const express = require("express");
const {
  getAllAttendance,
  getAttendanceByUser,
  getAttendanceByClassAndDate,
  createOrUpdateAttendance,
} = require("../controllers/attendanceController");
const ClassesModel = require("../models/ClassesModel");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For creating/updating, the campus comes from the classID in the body
    if (req.method === 'POST' && req.body.classID) {
      const classDoc = await ClassesModel.findById(req.body.classID).select('campusID').lean();
      return classDoc?.campusID;
    }
    return null;
  }
};

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

// Get a specific user's attendance history (Student/Teacher/Parent Portal)
route.get("/user/:id", protect, authorize("admin", "teacher", "student", {
  ownershipCheck: (req) => {
    if (req.user.role === 'admin') return true;
    // Students and Teachers can only get their own attendance
    return req.user.userID === req.params.id;
  }
}), getAttendanceByUser);

// Get or create a new attendance sheet for a specific class and date (Teacher/Admin Portal)
route.get("/class/:classID/:date", protect, authorize("admin", "teacher", classTeacherCheckOptions), getAttendanceByClassAndDate);

// Create or update an attendance record (Teacher/Admin Portal)
route.post(
  "/update",
  protect,
  authorize("admin", "teacher", { ...campusCheckOptions, ...classTeacherCheckOptions }),
  createOrUpdateAttendance
);

module.exports = route;
