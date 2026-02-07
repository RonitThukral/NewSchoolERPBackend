const express = require("express");
const route = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const {
  getAllHomeworks,
  getHomeworkById,
  getHomeworksByClass,
  createHomework,
  updateHomework,
  deleteHomework,
} = require("../controllers/homeworkController");
const HomeWorkModel = require("../models/HomeWorkModel");
const ClassesModel = require("../models/ClassesModel");
const CoursesModel = require("../models/CoursesModel");
const { protect, authorize } = require("../middlewares/auth");

const upload = multer({ storage: storage });

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For creating a new resource, get campus from the classID
    if (req.method === 'POST' && req.body.classID) {
      const classDoc = await ClassesModel.findById(req.body.classID).select('campusID').lean();
      return classDoc?.campusID;
    }
    // For updating/deleting, get campus from the homework's classID
    if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
      const homework = await HomeWorkModel.findById(req.params.id).populate('classID', 'campusID').lean();
      return homework?.classID?.campusID;
    }
    return null;
  }
};

const subjectTeacherCheckOptions = {
  ownershipCheck: async (req) => {
    // Admins have full access
    if (req.user.role === 'admin') return true;

    if (req.user.role === 'teacher') {
      let classId, courseId;

      if (req.method === 'POST') {
        // For creating homework, get details from the body
        classId = req.body.classID;
        courseId = req.body.courseID;
      } else if (req.method === 'PUT' || req.method === 'DELETE') {
        // For updating/deleting, get details from the existing homework document
        const homework = await HomeWorkModel.findById(req.params.id).select('classID courseID').lean();
        if (!homework) return false; // Homework not found, deny access
        classId = homework.classID;
        courseId = homework.courseID;
      }

      if (!classId || !courseId) return false;

      // Check if the teacher is assigned to this course in this class
      const course = await CoursesModel.findOne({ _id: courseId, 'classAssignments.classID': classId, 'classAssignments.teacherID': req.user._id }).lean();
      return !!course; // Returns true if a matching assignment is found, false otherwise
    }
    return false; // Deny by default for other roles
  }
};

route.get("/", protect, authorize("admin"), getAllHomeworks);

route.get("/:id", protect, authorize("admin", "teacher", "student"), getHomeworkById);

// get homeworks by classID
route.get("/class/:classID", protect, authorize("admin", "teacher", "student"), getHomeworksByClass);

// create homework
route.post(
  "/upload",
  protect,
  upload.fields([{ name: "pdf" }, { name: "image" }]),
  authorize("admin", "teacher", { ...campusCheckOptions, ...subjectTeacherCheckOptions }),
  createHomework
);

// update homework
route.put(
  "/update/:id",
  protect,
  authorize("admin", "teacher", { ...campusCheckOptions, ...subjectTeacherCheckOptions }),
  upload.fields([{ name: "pdf" }, { name: "image" }]),
  updateHomework
);

// delete homework
route.delete("/delete/:id", protect, authorize("admin", "teacher", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), deleteHomework);

module.exports = route;
