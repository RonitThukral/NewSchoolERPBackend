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
const { protect, authorize } = require("../middlewares/auth");
const route = express.Router();

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    const ClassesModel = await req.getModel('classes');
    const QuizModel = await req.getModel('quizzes');

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
    if (req.user.role === 'admin' || req.user.role === 'super-admin') return true;

    if (req.user.role === 'teacher') {
      const ClassesModel = await req.getModel('classes');
      const QuizModel = await req.getModel('quizzes');
      const CoursesModel = await req.getModel('courses');

      let classId;

      if (req.method === 'POST') {
        // For creating a quiz, get class from the body
        classId = req.body.classID;
      } else if (req.method === 'PUT' || req.method === 'DELETE' || req.path.includes('add-')) {
        // For updating/deleting, get details from the existing quiz document
        const quiz = await QuizModel.findById(req.params.id).select('classID').lean();
        if (!quiz) return false; // Quiz not found, deny access
        classId = quiz.classID;
      }

      if (!classId) return false;

      // Check if the teacher is assigned to this class as the class teacher
      const classDoc = await ClassesModel.findById(classId).select('teacherID').lean();
      if (classDoc && classDoc.teacherID && classDoc.teacherID.toString() === req.user._id.toString()) {
        return true;
      }

      // Also check if teacher teaches any course in this class
      const course = await CoursesModel.findOne({
        'classAssignments.classID': classId,
        'classAssignments.teacherID': req.user._id
      }).lean();
      return !!course;
    }
    return false; // Deny by default for other roles
  }
};

// All routes are mounted at /api/quizzes in server.js

// get all
route.get("/", protect, authorize("admin", "teacher", "student", "super-admin"), getAllQuizzes);

// get one by id
route.get("/:id", protect, authorize("admin", "teacher", "student", "super-admin"), getQuizById);

// create
route.post("/create", protect, authorize("admin", "teacher", "super-admin", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), createQuiz);

// update
route.put("/:id", protect, authorize("admin", "teacher", "super-admin", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), updateQuiz);

// add question
route.post("/:id/add-question", protect, authorize("admin", "teacher", "super-admin", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), addQuestion);

// add participants with score
route.post("/:id/add-participant", protect, authorize("admin", "teacher", "super-admin", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), addParticipant);

// student submits a quiz
route.post("/:id/submit", protect, authorize("student"), submitQuiz);

// delete
route.delete("/:id", protect, authorize("admin", "teacher", "super-admin", { ...campusCheckOptions, ...subjectTeacherCheckOptions }), deleteQuiz);

module.exports = route;