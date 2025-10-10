const express = require("express");
const FilesModel = require("../models/FilesModel");
const { protect, authorize } = require("../middlewares/auth");
const ClassesModel = require("../models/ClassesModel");

const route = express.Router();

route.get("/", protect, authorize("admin", "teacher"), async (req, res) => {
  const { user, query } = req;
  try {
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) { // Campus Admin
      // Admins default to their own campus, but can view others via query param
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // Global Admin filtering
      campusFilter.campusID = query.campusID;
    }

    const data = await FilesModel.find(campusFilter)
      .populate('campusID', 'name').populate('classID', 'name').populate('courseID', 'name').sort({ createdAt: "desc" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//get one by id
route.get("/:id", protect, authorize("admin", "teacher", "student"), async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
    }
    const doc = await FilesModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    // Campus check for admin
    if (req.user.campusID && doc.campusID && doc.campusID.toString() !== req.user.campusID.toString()) {
      return res.status(403).json({ success: false, error: "Not authorized to view this file." });
    }
    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//get course notes
route.get("/course/:id", protect, authorize("admin", "teacher", "student"), async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: courseID" });
    }
    const docs = await FilesModel.find({ courseID: req.params.id });
    res.json({ success: true, docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//create task
route.post("/create", protect, authorize("admin", "teacher"), async (req, res) => {
  try {
    const { classID } = req.body;
    let campusID;

    if (classID) {
      const classDoc = await ClassesModel.findById(classID).select('campusID').lean();
      if (classDoc) campusID = classDoc.campusID;
    }

    const fileData = { ...req.body, campusID: campusID || req.user.campusID?._id };
    const doc = await FilesModel.create(fileData);
    res.status(201).json({ success: true, doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

//edit task
route.put("/update/:id", protect, authorize("admin", "teacher"), async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
    }
    const doc = await FilesModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    res.json({ success: true, doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

//delete task
route.delete("/delete/:id", protect, authorize("admin", "teacher"), async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
    }
    const doc = await FilesModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    res.json({ success: true, message: "File deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = route;
