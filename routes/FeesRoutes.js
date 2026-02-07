const express = require("express");
const {
  getAllFees,
  getFeeTypes,
  getFeeById,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeById,
} = require("../controllers/feesController");
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
      // Use tenant-aware model
      const FeesModel = await req.getModel('fees');
      const fee = await FeesModel.findById(req.params.id).select('campusID').lean();
      return fee?.campusID;
    }
    return null;
  }
};

//get all fees
route.get("/", protect, authorize("admin", "teacher"), getAllFees);

route.get("/types", protect, getFeeTypes);

//get one class fees
route.get("/:id", protect, authorize("admin", "teacher"), getFeeById);

//add fees for class
route.post("/create", protect, authorize("admin", campusCheckOptions), createFeeStructure);

//update class fees
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateFeeStructure);

//delete  class fees
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteFeeById);

module.exports = route;
