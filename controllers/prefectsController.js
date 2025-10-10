const PrefectsModel = require("../models/PrefectsModel");
const StudentModel = require("../models/StudentModel");
const { role } = require("../middlewares/variables");

exports.getAllPrefects = async (req, res) => {
  const { user, query } = req;
  try {
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      // Admins default to their own campus, but can view others via query param
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      // Super-admins can filter by any campus
      campusFilter.campusID = query.campusID;
    }

    const data = await PrefectsModel.find(campusFilter)
      .populate('campusID', 'name').sort({ createdAt: "desc" });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getPrefectById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: userID");
  }
  try {
    const user = await PrefectsModel.findOne({ userID: req.params.id });
    if (user) {
      return res.json({ success: true, user });
    }
    res.status(404).json({ success: false, error: "Prefect does not exist" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.addPrefect = async (req, res) => {
  try {
    const { userID } = req.body;

    const studentExist = await StudentModel.findOne({ userID, role: role.Student });
    if (!studentExist) {
      return res.status(404).json({ success: false, error: "Student ID does not exist" });
    }

    const prefectExist = await PrefectsModel.findOne({ userID });
    if (prefectExist) {
      return res.status(409).json({ success: false, error: "This student is already a prefect" });
    }

    const doc = await PrefectsModel.create({
      ...req.body,
      campusID: studentExist.campusID, // Automatically add campusID from the student record
      name: `${studentExist.name} ${studentExist.surname}` // Ensure name is consistent
    });
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updatePrefect = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await PrefectsModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Prefect not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deletePrefect = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await PrefectsModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Prefect deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};