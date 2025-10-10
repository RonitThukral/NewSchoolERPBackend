const express = require("express");
const CurrentModel = require("../models/CurrentModel");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

//get all events
route.get("/", protect, authorize("admin", "teacher", "student"), async (req, res) => {
  try {
    const docs = await CurrentModel.find().sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//get one by id
route.get("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
    }
    const doc = await CurrentModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//create
route.post("/create", protect, authorize("admin"), async (req, res) => {
  try {
    const doc = await CurrentModel.create(req.body);
    res.status(201).json({ success: true, doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

//edit
route.put("/update/:id", protect, authorize("admin"), async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
    }
    const doc = await CurrentModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    res.json({ success: true, doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

//delete
route.delete("/delete/:id", protect, authorize("admin"), async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
    }
    const doc = await CurrentModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    res.json({ success: true, message: "Record deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = route;
