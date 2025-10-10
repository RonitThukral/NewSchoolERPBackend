const express = require("express");
const {
  getAllPrefects,
  getPrefectById,
  addPrefect,
  updatePrefect,
  deletePrefect,
} = require("../controllers/prefectsController");
const PrefectsModel = require("../models/PrefectsModel");
const StudentModel = require("../models/StudentModel");
const { protect, authorize } = require("../middlewares/auth");
const route = express.Router();

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For creating a new prefect
    if (req.method === 'POST' && req.body.userID) {
      const student = await StudentModel.findOne({ userID: req.body.userID }).select('campusID').lean();
      return student?.campusID;
    }
    // For updating/deleting an existing prefect by their _id
    if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
      const prefect = await PrefectsModel.findById(req.params.id).select('userID').lean();
      if (prefect && prefect.userID) {
        const student = await StudentModel.findOne({ userID: prefect.userID }).select('campusID').lean();
        return student?.campusID;
      }
    }
    return null;
  }
};

//get all
route.get("/", protect, authorize("admin", "teacher"), getAllPrefects);

//get one by id
route.get("/:id", protect, authorize("admin", "teacher"), getPrefectById);

//add
route.post("/add", protect, authorize("admin", campusCheckOptions), addPrefect);

//edit task
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updatePrefect);

//delete task
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deletePrefect);

module.exports = route;
