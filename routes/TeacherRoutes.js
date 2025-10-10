const express = require("express");
const {
  // ... (imports remain the same)
  getAllStaff,
  getAllTeachers,
  getTeacherById,
  getTeacherBankDetails,
  getTeacherCourses,
  createTeacher,
  signInTeacher,
  changeTeacherPassword,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacherController");
const TeacherModel = require("../models/TeacherModel");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For creating a new resource
    if (req.method === 'POST' && req.body.campusID) {
      return req.body.campusID;
    }
    // For updating/deleting an existing resource by userID in params
    if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
      const teacher = await TeacherModel.findOne({ userID: req.params.id }).select('campusID').lean();
      return teacher?.campusID;
    }
    return null;
  }
};

//all teachers
route.get("/", protect, authorize("admin"), getAllStaff);

route.get("/teachers", protect, authorize("admin"), getAllTeachers);

//get one teacher by id
route.get("/:id", protect, authorize('admin', 'teacher', {
  ownershipCheck: (req) => {
    if (req.user.role === 'admin') return true;
    // Teachers can only get their own data
    if (req.user.role === 'teacher') {
      return req.user.userID === req.params.id;
    }
    return false; // Deny by default
  }
}), getTeacherById);

//get teacher bank details
route.get("/bank/:id", protect, authorize("admin"), getTeacherBankDetails);

//get teacher courses
route.get("/courses/:id", protect, authorize('admin', 'teacher', {
  ownershipCheck: (req) => {
    if (req.user.role === 'admin') return true;
    // Teachers can only get their own courses
    if (req.user.role === 'teacher') {
      return req.user.userID === req.params.id;
    }
    return false; // Deny by default
  }
}), getTeacherCourses);

//create
route.post("/create", protect, authorize("admin", campusCheckOptions), createTeacher);

//login
route.post("/signin", signInTeacher);

//change password
route.post("/changePassword/:id", protect, changeTeacherPassword);

//edit
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateTeacher);

//delete
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteTeacher);

module.exports = route;
