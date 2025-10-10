const express = require("express");
const CorrespondanceModel = require("../models/CorrespondanceModel");
const { protect, authorize } = require("../middlewares/auth");
const route = express.Router();

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    if (req.method === 'POST' && req.body.campusID) {
      return req.body.campusID;
    }
    if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
      const doc = await CorrespondanceModel.findById(req.params.id).select('campusID').lean();
      return doc?.campusID;
    }
    return null;
  }
};

route.get("/", protect, authorize("admin"), async (req, res) => {
  const { user, query } = req;
  try {
    let campusFilter = {};
    if (user.campusID) { // Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // Global Admin filtering
      campusFilter.campusID = query.campusID;
    }

    const docs = await CorrespondanceModel.find(campusFilter)
      .populate('campusID', 'name').populate('classID', 'name')
      .sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//get one by id
route.get("/:id", protect, authorize("admin"), async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await CorrespondanceModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }
    // Campus check for admin
    if (req.user.campusID && doc.campusID.toString() !== req.user.campusID.toString()) {
      return res.status(403).json({ success: false, error: "Not authorized to view this document." });
    }
    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

//create
route.post("/create", protect, authorize("admin", campusCheckOptions), async (req, res) => {
  try {
    const doc = await CorrespondanceModel.create(req.body);
    res.status(201).json({ success: true, doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

//edit
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await CorrespondanceModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }
    res.json({ success: true, doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

//delete
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await CorrespondanceModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }
    res.json({ success: true, message: "Document deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = route;
