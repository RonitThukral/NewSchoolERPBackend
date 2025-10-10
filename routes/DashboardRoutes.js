const express = require("express");
const {
  getStaffDashboardCounts,
  getStudentDashboardCounts,
  getSystemWideCounts,
} = require("../controllers/dashboardController");
const { protect, authorize } = require("../middlewares/auth");
const route = express.Router();

//staff count
route.get("/dashboard/staff/:id", protect, authorize("admin", "teacher"), getStaffDashboardCounts);

//count
route.get("/dashboard/student/:id", protect, authorize("admin", "teacher", "student"), getStudentDashboardCounts);

route.get("/dashboard/counts", protect, authorize("admin"), getSystemWideCounts);

module.exports = route;
