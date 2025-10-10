const NotificationsModal = require("../models/NoticeModel");

exports.getAllNotifications = async (req, res) => {
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

    const data = await NotificationsModal.find(campusFilter)
      .populate('createdBy', 'name')
      .populate('campusID', 'name')
      .sort({ createdAt: "desc" });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getPastNotifications = async (req, res) => {
  const { user, query } = req;
  try {
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      campusFilter.campusID = query.campusID; // Global admins can filter by any campus
    }

    const data = await NotificationsModal.find({
      publishDate: { $lte: new Date() },
      ...campusFilter
    }).sort({ publishDate: "desc" });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getUpcomingNotifications = async (req, res) => {
  const { user, query } = req;
  try {
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      campusFilter.campusID = query.campusID; // Global admins can filter by any campus
    }

    const now = new Date();
    const data = await NotificationsModal.find({
      $or: [{ expiryDate: { $gte: now } }, { expiryDate: null }], // Not expired or no expiry date
      publishDate: { $lte: now }, // Already published
      ...campusFilter
    }).sort({ publishDate: "desc" });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getNotificationsByTitle = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: username");
  }

  try {
    const docs = await NotificationsModal.find({ title: { $regex: req.params.id, $options: "i" } });
    if (docs) {
      return res.json({ success: true, docs });
    } else {
      return res.json({ success: false, error: "Does not exists" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const doc = await NotificationsModal.create(req.body);
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateNotification = async (req, res) => {
  try {
    const doc = await NotificationsModal.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: "Failed to update" });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const doc = await NotificationsModal.findOneAndDelete({ _id: req.params.id });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    const doc = await NotificationsModal.deleteMany({});
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};