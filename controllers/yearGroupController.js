const YearGroupModel = require("../models/YearGroupModel");
const { stringtoLowerCase } = require("../middlewares/utils");

exports.getAllYearGroups = async (req, res) => {
  const { user, query } = req;
  try {
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      // Admins default to their own campus, but can view others via query param
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      // Global admins can filter by any campus
      campusFilter.campusID = query.campusID;
    }

    const data = await YearGroupModel.find(campusFilter).populate('campusID', 'name').sort({ createdAt: "desc" });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.createYearGroup = async (req, res) => {
  try {
    const { name, year, campusID } = req.body;
    const code = stringtoLowerCase(name);

    // A Global Admin must provide a campusID. A Campus Admin's campusID is used automatically.
    const finalCampusID = req.user.campusID ? req.user.campusID._id : campusID;
    if (!finalCampusID) {
      return res.status(400).json({ success: false, error: "Campus ID is required to create a year group." });
    }

    const yearGroupExist = await YearGroupModel.findOne({ code: code, year: year, campusID: finalCampusID });
    if (yearGroupExist) {
      return res.status(409).json({ success: false, error: "This Year Group already exists for this campus." });
    }

    const doc = await YearGroupModel.create({ ...req.body, code, campusID: finalCampusID });
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateYearGroup = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await YearGroupModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Year Group not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteYearGroup = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await YearGroupModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Year Group not found" });
    }
    res.json({ success: true, message: "Year Group deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};