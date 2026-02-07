const express = require("express");
const {
  getActiveClasses,
  getAllClasses,
  getPastClasses,
  getClassById,
  getClassesByTeacher,
  createClass,
  updateClass,
  deleteClass,
} = require("../controllers/classesController");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For creating a new resource
    if (req.method === 'POST' && req.body.campusID) {
      return req.body.campusID;
    }
    // For updating/deleting an existing resource by _id in params
    if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
      const ClassesModel = await req.getModel('classes');
      const classDoc = await ClassesModel.findById(req.params.id).select('campusID').lean();
      return classDoc?.campusID;
    }
    return null;
  }
};

route.get("/", protect, authorize("admin", "teacher"), getActiveClasses);

route.get("/all", protect, authorize("admin"), getAllClasses);

route.get("/past", protect, authorize("admin"), getPastClasses);

//get one by id
route.get("/:id", protect, authorize("admin", "teacher"), getClassById);

//teacher ID
route.get("/teacher/:id", protect, authorize("admin", "teacher"), getClassesByTeacher);

//create
route.post("/create", protect, authorize("admin", campusCheckOptions), createClass);

//edit
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateClass);

//delete
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteClass);

module.exports = route;
