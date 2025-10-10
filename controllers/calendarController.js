const CalendarModel = require("../models/CalenderModel");

exports.getAllEvents = async (req, res) => {
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

    const docs = await CalendarModel.find(campusFilter).populate('campusID', 'name').sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getUpcomingEvents = async (req, res) => {
  const { user, query } = req;
  try {
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      campusFilter.campusID = query.campusID;
    }

    const now = new Date();
    // Set end date to 30 days from now for a wider upcoming range
    const end = new Date();
    end.setDate(now.getDate() + 30);

    const docs = await CalendarModel.find({ date: { $gte: now, $lte: end }, ...campusFilter })
      .populate('campusID', 'name').sort({ date: "asc" });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getEventById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await CalendarModel.findById(req.params.id);
    if (doc) {
      return res.json({ success: true, doc });
    } else {
      return res.status(404).json({ success: false, error: "Event not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const eventData = { ...req.body };
    // If the creator is a Campus Admin, enforce their campusID.
    // A Global Admin must provide the campusID in the body.
    if (req.user.campusID) {
      eventData.campusID = req.user.campusID._id;
    }

    const doc = await CalendarModel.create(eventData);
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await CalendarModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await CalendarModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }
    res.json({ success: true, message: "Event deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};