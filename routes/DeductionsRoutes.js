const express = require("express");
const {
  getAllDeductions,
  getDeductionByCode,
  createDeduction,
  updateDeduction,
  deleteDeduction,
} = require("../controllers/deductionsController");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

//get all events
route.get("/", protect, authorize("admin"), getAllDeductions);

//get one by id
route.get("/:id", protect, authorize("admin"), getDeductionByCode);

//create
route.post("/create", protect, authorize("admin"), createDeduction);

//edit
route.put("/update/:id", protect, authorize("admin"), updateDeduction);

//delete
route.delete("/delete/:id", protect, authorize("admin"), deleteDeduction);

module.exports = route;
