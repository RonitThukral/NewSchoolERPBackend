const LeaveApplicationModel = require("../models/LeaveApplicationModel");
const cloudinary = require("../middlewares/cloudinary");
const streamifier = require("streamifier");
const StudentModel = require("../models/StudentModel"); // Added
const TeacherModel = require("../models/TeacherModel"); // Added

exports.getAllLeaveApplications = async (req, res) => {
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

    const data = await LeaveApplicationModel.find(campusFilter)
      .populate('applicant', 'name userID').populate('campusID', 'name')
      .sort({ createdAt: "desc" });
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ success: false, error: err });
  }
};

exports.getLeaveApplicationById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await LeaveApplicationModel.findOne({ _id: req.params.id });
    if (doc) {
      return res.json({ success: true, doc });
    } else {
      return res.json({ success: false, error: "Does not exists" });
    }
  } catch (err) {
    return res.status(400).json({ success: false, error: "Server error " + err });
  }
};

exports.getLeaveApplicationsByUserId = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    // Find the user's _id first to use in the query
    const user = await StudentModel.findOne({ userID: req.params.id }).select('_id') || await TeacherModel.findOne({ userID: req.params.id }).select('_id');
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const doc = await LeaveApplicationModel.find({ applicant: user._id });
    if (doc) {
      return res.json({ success: true, doc });
    } else {
      return res.json({ success: false, error: "Does not exists" });
    }
  } catch (err) {
    return res.status(400).json({ success: false, error: "Server error " + err });
  }
};

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "DreamsCloudtech" },
      (error, result) => (result ? resolve(result) : reject(error))
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

exports.createLeaveApplication = async (req, res) => {
  try {
    const { startDate, endDate, reason, applicant, applicantType, academicYear, campusID } = req.body;

    if (!startDate || !endDate || !reason || !applicant || !applicantType) {
      return res.status(400).json({ message: "Start date, end date, reason, applicant, and applicant type are required." });
    }

    const attachments = [];
    if (req.files) {
      for (const key in req.files) {
        for (const file of req.files[key]) {
          const result = await uploadToCloudinary(file);
          attachments.push({
            fileName: file.originalname,
            fileUrl: result.secure_url,
            fileType: file.mimetype,
          });
        }
      }
    }

    const newApplication = new LeaveApplicationModel({
      applicant,
      applicantType,
      startDate,
      endDate,
      reason,
      attachments,
      academicYear,
      campusID
    });

    const savedApplication = await newApplication.save();

    res.status(201).json({
      success: true,
      message: "Leave application submitted successfully!",
      data: savedApplication,
    });
  } catch (error) {
    console.error("Error submitting leave application:", error);
    res.status(500).json({
      success: false,
      message: "Server error while submitting application.",
    });
  }
};

exports.updateLeaveApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  if (!status) {
    return res.status(400).json({ success: false, error: "Missing 'status' in request body" });
  }

  const allowedStatuses = ["approved", "pending", "rejected"];
  if (!allowedStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`,
    });
  }

  try {
    const updatedDoc = await LeaveApplicationModel.findByIdAndUpdate(id, { $set: { status: status } }, { new: true });
    if (!updatedDoc) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }
    return res.json({ success: true, message: "Status updated successfully", doc: updatedDoc });
  } catch (err) {
    console.error("Server error while updating status:", err);
    return res.status(500).json({ success: false, error: "Server error: " + err.message });
  }
};

exports.deleteLeaveApplication = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: username");
  }
  try {
    const doc = await LeaveApplicationModel.findOneAndDelete({ _id: req.params.id });
    if (doc) {
      return res.json({ success: true, message: "Deleted successfully" });
    } else {
      return res.json({ success: false, error: "Does not exists" });
    }
  } catch (err) {
    return res.status(400).json({ success: false, error: "Server error " + err });
  }
};