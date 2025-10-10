const ClassesModel = require("../models/ClassesModel");
const { stringtoLowerCaseSpace } = require("../middlewares/utils");

exports.getActiveClasses = async (req, res) => {
  const { user, query } = req;
  try {
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      campusFilter.campusID = query.campusID; // Global admins can filter by any campus
    }

    const docs = await ClassesModel.find({ isArchived: false, ...campusFilter }).sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getAllClasses = async (req, res) => {
  const { user, query } = req;
  try {
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      campusFilter.campusID = query.campusID; // Global admins can filter by any campus
    }

    const docs = await ClassesModel.find(campusFilter).sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getPastClasses = async (req, res) => {
  const { user, query } = req;
  try {
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      campusFilter.campusID = query.campusID; // Global admins can filter by any campus
    }

    const docs = await ClassesModel.find({ isArchived: true, ...campusFilter }).sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getClassById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await ClassesModel.findById(req.params.id);
    if (doc) {
      return res.json({ success: true, doc });
    } else {
      return res.status(404).json({ success: false, error: "Class not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getClassesByTeacher = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: teacherID");
  }
  try {
    const docs = await ClassesModel.find({ teacherID: req.params.id });
    res.json({ success: true, docs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.createClass = async (req, res) => {
  try {
    const { name, classCode } = req.body;
    const code = stringtoLowerCaseSpace(classCode);

    const classExist = await ClassesModel.findOne({ classCode: code });
    if (classExist) {
      return res.status(409).json({ success: false, error: "Class code already exists" });
    }

    const doc = await ClassesModel.create({ ...req.body, classCode: code, name });
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateClass = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await ClassesModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Class not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteClass = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await ClassesModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Class deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};