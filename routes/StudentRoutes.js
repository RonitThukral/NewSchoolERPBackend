const express = require("express");
const multer = require("multer");
const { getStudentAcademicReport } = require("../controllers/sbaController");
const ClassesModel = require("../models/ClassesModel");
const CoursesModel = require("../models/CoursesModel");
const StudentModel = require("../models/StudentModel");
const path = require("path");
const {
  bulkDeleteStudents,
  bulkUpdateStudents,
  getAllActiveStudents,
  getWithdrawnStudents,
  getPastStudents,
  getUnpaidFees,
  getStudentById,
  getAdmissionStats,
  getStudentCourses,
  getStudentCountByCategory,
  searchStudents,
  getAllParents,
  getParentsByStudentId,
  getStudentsByClass,
  createStudent,
  signInStudent,
  changeStudentPassword,
  promoteStudent,
  readmitStudent,
  updateStudent,
  upgradeClass,
  graduateClass,
  upgradeCampus,
  deleteStudent,
  parseStudentFileHeaders,
  processMappedStudentFile,
} = require("../controllers/studentController");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

// Multer setup for file upload
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
      const student = await StudentModel.findOne({ userID: req.params.id }).select('campusID').lean();
      return student?.campusID;
    }
    // For bulk operations, we assume the campusID is provided in the body
    if (req.body.campusID) {
      return req.body.campusID;
    }
    // For promoting a student, we get the student from the body userID
    if (req.path === '/promote' && req.body.userID) {
      const student = await StudentModel.findOne({ userID: req.body.userID }).select('campusID').lean();
      return student?.campusID;
    }
    return null;
  }
};

route.post("/upload/parse-headers", protect, authorize("admin"), upload.single("file"), parseStudentFileHeaders);
route.post(
  "/upload/process-mapped",
  protect,
  authorize("admin", { checkCampus: true, getCampusIdForResource: (req) => req.body.campusID }),
  upload.single("file"),
  processMappedStudentFile
);
// Bulk Delete Students based on selected IDs
route.post("/bulk-delete", protect, authorize("admin", campusCheckOptions), bulkDeleteStudents);

// Bulk Update Students based on .csv file
route.post("/bulk-update", protect, authorize("admin"), upload.single("file"), bulkUpdateStudents);

//get all students
route.get("/", protect, authorize("admin", "teacher"), getAllActiveStudents);

//withdraw
route.get("/withdraw", protect, authorize("admin"), getWithdrawnStudents);

route.get("/past", protect, authorize("admin"), getPastStudents);

//unpaid fees
route.get("/unpaidfees/:year/:term", protect, authorize("admin"), getUnpaidFees);

//get one student by id
route.get("/student/:id", protect, authorize('admin', 'teacher', 'student', {
  ownershipCheck: (req) => {
    // Admins and Teachers have access
    if (req.user.role === 'admin' || req.user.role === 'teacher') return true;
    // Students can only get their own data
    if (req.user.role === 'student') {
      return req.user.userID === req.params.id;
    }
    // Deny by default
    return false;
  }
}), getStudentById);

//admission
route.get("/student/admission/:from/:to", protect, authorize("admin"), getAdmissionStats);

//get studentCourses
route.get("/student/courses/:id", protect, authorize('admin', 'teacher', 'student', {
  ownershipCheck: (req) => {
    // Admins and Teachers have access
    if (req.user.role === 'admin' || req.user.role === 'teacher') return true;
    // Students can only get their own courses
    if (req.user.role === 'student') {
      return req.user.userID === req.params.id;
    }
    return false;
  }
}), getStudentCourses);

//get student academic report
route.get("/student/report/:userID/:year/:term", protect, authorize("admin", "teacher", "student", {
  ownershipCheck: async (req) => {
    const { user } = req;
    const { userID } = req.params;

    // Global Admins (no campusID) and Campus Admins can access
    if (user.role === 'admin') return true;

    if (req.user.role === 'student') {
      return user.userID === userID;
    }

    if (user.role === 'teacher') {
      const student = await StudentModel.findOne({ userID }).select('classID').lean();
      if (!student) return false;

      // Check if the teacher is the class teacher for this student
      const studentClass = await ClassesModel.findById(student.classID).select('teacherID').lean();
      if (studentClass && studentClass.teacherID && studentClass.teacherID.toString() === user._id.toString()) {
        return true;
      }

      // Check if the teacher teaches any course to this student's class
      const taughtCourse = await CoursesModel.findOne({ 'classAssignments.classID': student.classID, 'classAssignments.teacherID': user._id }).lean();
      return !!taughtCourse;
    }
    return false;
  }
}), getStudentAcademicReport);

//get category num
route.get("/number/:category/:value", protect, authorize("admin"), getStudentCountByCategory);

//search students by id or name
route.get("/search/:id", protect, authorize("admin", "teacher"), searchStudents);

//search students by id or name
// This route seems redundant or incorrectly implemented, so it's commented out.
// The /search/:id route already handles searching.
// route.get("/search/:id/:name/:classID", searchStudents);

//get all parents
route.get("/parents", protect, authorize("admin"), getAllParents);

//search parents
route.get("/parents/:id", protect, authorize("admin", "teacher"), getParentsByStudentId);

//get students in class
route.get("/class/:id", protect, authorize("admin", "teacher"), getStudentsByClass);

//student class
// This route seems redundant. getStudentsByClass is more standard.
// route.get("/student/class/:id/:userID", ...);

route.post("/create", protect, authorize("admin", campusCheckOptions), createStudent);

//login
route.post("/signin", signInStudent);

route.put("/changePassword/:id", protect, changeStudentPassword);

route.put("/readmit/:id", protect, authorize("admin", campusCheckOptions), readmitStudent);

//update info
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateStudent);

// Promote a single student
route.post("/promote", protect, authorize("admin", campusCheckOptions), promoteStudent);

//change students class
route.post("/upgrade/class", protect, authorize("admin", campusCheckOptions), upgradeClass);

//promote graduate  students
route.post("/upgrade/graduate", protect, authorize("admin"), graduateClass);

//change student campus
route.post("/upgrade/campus", protect, authorize("admin"), upgradeCampus);

//delete student
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteStudent);

module.exports = route;
