const express = require("express");
const {
  getAllScholarships,
  getScholarshipById,
  getScholarshipByName,
  createScholarship,
  updateScholarship,
  deleteScholarship,
} = require("../controllers/scholarshipController");
const ScholarshipModel = require("../models/ScholarshipsModel");
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
      const scholarship = await ScholarshipModel.findById(req.params.id).select('campusID').lean();
      return scholarship?.campusID;
    }
    return null;
  }
};

route.get("/", protect, authorize("admin"), getAllScholarships);

//get one by id
route.get("/:id", protect, authorize("admin"), getScholarshipById);

route.get("/name/:id", protect, authorize("admin"), getScholarshipByName);

//create
route.post("/create", protect, authorize("admin", campusCheckOptions), createScholarship);

//edit task
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateScholarship);

//delete task
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteScholarship);

module.exports = route;
