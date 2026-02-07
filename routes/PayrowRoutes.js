const express = require("express");
const {
  getAllPayrows,
  getPayrowByCode,
  createPayrow,
  updatePayrow,
  deletePayrow,
} = require("../controllers/payrowController");
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
      const PayrowModel = await req.getModel('payroll');
      const payrow = await PayrowModel.findById(req.params.id).select('campusID').lean();
      return payrow?.campusID;
    }
    return null;
  }
};

//get all events
route.get("/", protect, authorize("admin"), getAllPayrows);

//get one by id
route.get("/:id", protect, authorize("admin"), getPayrowByCode);

//create
route.post("/add", protect, authorize("admin", campusCheckOptions), createPayrow);

//edit
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updatePayrow);

//delete
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deletePayrow);

module.exports = route;
