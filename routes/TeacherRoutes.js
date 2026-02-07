const express = require("express");
const multer = require("multer");
const path = require("path");
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
  processMappedTeacherFile,
} = require("../controllers/teacherController");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

// Multer setup
const upload = multer({ dest: path.join(__dirname, "../uploads") });

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For creating a new resource
    if (req.method === 'POST' && req.body.campusID) {
      return req.body.campusID;
    }
    // For updating/deleting an existing resource by userID in params
    if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
      const TeacherModel = await req.getModel('teachers');
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

// Bulk Import
route.post(
  "/upload/process-mapped",
  protect,
  authorize("admin", { checkCampus: true, getCampusIdForResource: (req) => req.body.campusID }),
  upload.single("file"),
  processMappedTeacherFile
);

//login
route.post("/signin", signInTeacher);

//change password
route.post("/changePassword/:id", protect, changeTeacherPassword);

//edit
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateTeacher);

//delete
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteTeacher);

module.exports = route;
