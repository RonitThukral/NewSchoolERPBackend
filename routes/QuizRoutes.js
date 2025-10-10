const express = require("express");
const {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  addQuestion,
  addParticipant,
  deleteQuiz,
  submitQuiz,
} = require("../controllers/quizController");
const QuizModel = require("../models/QuizModel");
const ClassesModel = require("../models/ClassesModel");
const CoursesModel = require("../models/CoursesModel");
const { protect, authorize } = require("../middlewares/auth");
const route = express.Router();

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For creating a new resource, get campus from the classID
    if (req.method === 'POST' && req.body.classID) {
      const classDoc = await ClassesModel.findById(req.body.classID).select('campusID').lean();
      return classDoc?.campusID;
    }
    // For updating/deleting, get campus from the quiz's classID
    if ((req.method === 'PUT' || req.method === 'DELETE' || req.path.includes('add-')) && req.params.id) {
      const quiz = await QuizModel.findById(req.params.id).populate({ path: 'classID', select: 'campusID' }).lean();
      return quiz?.classID?.campusID;
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
        // For creating a quiz, get details from the body
        classId = req.body.classID;
        courseId = req.body.courseID;
      } else if (req.method === 'PUT' || req.method === 'DELETE' || req.path.includes('add-')) {
        // For updating/deleting, get details from the existing quiz document
        const quiz = await QuizModel.findById(req.params.id).select('classID courseID').lean();
        if (!quiz) return false; // Quiz not found, deny access
        classId = quiz.classID;
        courseId = quiz.courseID;
      }

      if (!classId || !courseId) return false;

      // Check if the teacher is assigned to this course in this class
      const course = await CoursesModel.findOne({ _id: courseId, 'classAssignments.classID': classId, 'classAssignments.teacherID': req.user._id }).lean();
      return !!course; // Returns true if a matching assignment is found, false otherwise
    }
    return false; // Deny by default for other roles
  }
};

//get all events
route.get("/", protect, authorize("admin", "teacher", "student"), getAllQuizzes);

//get one by id
route.get("/:id", protect, authorize("admin", "teacher", "student"), getQuizById);

// create
route.post("/create", protect, authorize("admin", "teacher", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), createQuiz);

// update
route.put("/:id", protect, authorize("admin", "teacher", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), updateQuiz);

// add question
route.post("/:id/add-question", protect, authorize("admin", "teacher", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), addQuestion);

// add participants with score
route.post("/:id/add-participant", protect, authorize("admin", "teacher", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), addParticipant);

// student submits a quiz
route.post("/:id/submit", protect, authorize("student"), submitQuiz);

// delete
route.delete("/:id", protect, authorize("admin", "teacher", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), deleteQuiz);

module.exports = route;