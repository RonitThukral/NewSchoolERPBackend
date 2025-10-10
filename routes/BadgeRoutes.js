const express = require("express");
const BadgeModel = require("../models/BadgeModel");
const StudentModel = require("../models/StudentModel");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

// Get all available badges in the system
route.get("/", protect, authorize("admin", "teacher", "student"), async (req, res) => {
  try {
    const badges = await BadgeModel.find();
    res.json({ success: true, badges });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// Get all badges earned by a specific student
route.get("/student/:userID", protect, authorize("admin", "teacher", "student"), async (req, res) => {
  try {
    const student = await StudentModel.findOne({ userID: req.params.userID })
      .populate('earnedBadges.badge')
      .select('earnedBadges')
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found." });
    }

    res.json({ success: true, earnedBadges: student.earnedBadges });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

module.exports = route;