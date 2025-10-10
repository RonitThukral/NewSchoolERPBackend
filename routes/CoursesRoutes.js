const express = require("express");
const {
  getAllCourses,
  getCourseById,
  getCoursesByClass,
  getCoursesByTeacher,
  createCourse,
  assignCourseToClass,
  updateCourse,
  deleteCourse,
} = require("../controllers/coursesController");
const { protect, authorize } = require("../middlewares/auth");
const ClassesModel = require("../models/ClassesModel");

const route = express.Router();

route.get("/", protect, authorize("admin", "teacher"), getAllCourses);

//get one by id
route.get("/:id", protect, authorize("admin", "teacher"), getCourseById);

//get class courses
route.get("/class/:id", protect, getCoursesByClass);

//get teacher courses
route.get("/teacher/:id", protect, getCoursesByTeacher);

//create
route.post("/create", protect, authorize("admin"), createCourse);

// Assign a course to a class (this is where the campus check happens)
route.post(
  "/:id/assign",
  protect,
  authorize("admin", {
    checkCampus: true,
    getCampusIdForResource: async (req) => {
      const classDoc = await ClassesModel.findById(req.body.classID).select('campusID').lean();
      return classDoc?.campusID;
    }
  }),
  assignCourseToClass
);

//edit
route.put("/update/:id", protect, authorize("admin"), (req, res, next) => {
  delete req.body.classAssignments; // Prevent updating assignments via this route
  next();
}, updateCourse);

//delete
route.delete("/delete/:id", protect, authorize("admin"), deleteCourse);

module.exports = route;
