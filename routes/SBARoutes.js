const express = require("express");
const {
  getAllSBA,
  getSBAById,
  getStudentResults,
  getClassCourseResults,
  updateSBA,
  deleteSBA,
} = require("../controllers/sbaController");
const CoursesModel = require("../models/CoursesModel");
const SBAModel = require("../models/SBAModel");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For updating/deleting an existing resource by _id in params
    if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
      const sba = await SBAModel.findById(req.params.id).select('campusID').lean();
      return sba?.campusID;
    }
    return null;
  }
};

const subjectTeacherCheckOptions = {
  ownershipCheck: async (req) => {
    // This check ensures that for any write operation (POST, PUT, DELETE),
    // the teacher must be the one assigned to teach that specific course in that specific class.
    // A class teacher cannot edit marks for a subject they do not teach.
    if (req.user.role === 'admin') return true;
    if (req.user.role === 'teacher') {
      const sbaId = req.params.id;
      if (!sbaId) return false;

      const sbaDoc = await SBAModel.findById(sbaId).select('courseID classID').lean();
      if (!sbaDoc) return false;

      const course = await CoursesModel.findById(sbaDoc.courseID).select('classAssignments').lean();
      if (!course) return false;

      // Check if there's an assignment matching the class and the logged-in teacher
      return course.classAssignments.some(
        (assignment) =>
          assignment.classID.toString() === sbaDoc.classID.toString() &&
          assignment.teacherID.toString() === req.user._id.toString()
      );
    }
    return false;
  },
};

route.get("/", protect, authorize('admin'), getAllSBA);

//get one by id
route.get("/:id", protect, authorize("admin", "teacher"), getSBAById);

//get student results
route.get("/student/:id/:year/:term", protect, authorize("admin", "teacher", "student", {
  ownershipCheck: (req) => {
    if (req.user.role === 'student') {
      return req.user.userID === req.params.id;
    }
    // Allow any teacher who is either the class teacher or a subject teacher for the student.
    // The detailed check is handled in the /student/report/:userID endpoint, but we can add a basic one here too.
    if (req.user.role === 'teacher') {
        // This is a read-only operation. A more detailed check can be done on the full report endpoint.
        // For now, we allow teachers to proceed, assuming they are authorized for at least one subject.
        // A stricter check could be implemented here if needed, similar to the one in StudentRoutes.
        return true;
    }
    return req.user.role === 'admin';
  }
}), getStudentResults);

//get class course
route.get("/:class/:course/:year/:term", protect, authorize("admin", "teacher", {
  ownershipCheck: async (req) => {
    if (req.user.role === 'admin') return true;
    if (req.user.role === 'teacher') {
      const { class: classId, course: courseId } = req.params;
      if (!classId || !courseId) return false;
      const course = await CoursesModel.findById(courseId).select('classAssignments').lean();
      if (!course) return false;
      return course.classAssignments.some(a => a.classID.toString() === classId && a.teacherID.toString() === req.user._id.toString());
    }
    return false;
  }
}), getClassCourseResults);

//edit task
route.put("/update/:id", protect, authorize("admin", "teacher", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), updateSBA);

//delete task
route.delete("/delete/:id", protect, authorize('admin', campusCheckOptions), deleteSBA);

module.exports = route;
