const ActivityModel = require("../models/ActivityLogs");

exports.getAllActivities = async (req, res) => {
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

    const docs = await ActivityModel.find(campusFilter)
      .populate('campusID', 'name')
      .sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getActivityById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await ActivityModel.findOne({ _id: req.params.id });
    if (doc) {
      return res.json({ success: true, doc });
    } else {
      return res.status(404).json({ success: false, error: "Does not exist" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const doc = await ActivityModel.create(req.body);
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateActivity = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await ActivityModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Activity log not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteActivity = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await ActivityModel.findOneAndDelete({ _id: req.params.id });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};
