const CanteenModel = require("../models/CanteenModel");
const StudentModel = require("../models/StudentModel");
const TeacherModel = require("../models/TeacherModel");

exports.getAllMembers = async (req, res) => {
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

    const docs = await CanteenModel.find(campusFilter).populate('campusID', 'name').sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getAllPayments = async (req, res) => {
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

    // Using an aggregation pipeline is more efficient than processing in Node.js
    const payments = await CanteenModel.aggregate([
      // Deconstruct the payments array into separate documents
      { $unwind: "$payments" },
      // Reshape the output documents
      {
        $project: {
          campusID: "$campusID", // Pass campusID through
          _id: "$payments._id",
          memberID: "$memberID",
          name: "$name",
          amount: "$payments.amount",
          paymentDate: "$payments.paymentDate",
          createdAt: "$payments.createdAt",
        },
      },
      // Apply the campus filter
      { $match: campusFilter },
      { $sort: { paymentDate: -1 } }
    ]);
    res.json({ success: true, payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getMemberById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: memberID");
  }
  try {
    const doc = await CanteenModel.findOne({ memberID: req.params.id }).populate('campusID', 'name');
    if (doc) {
      // Campus check for admin
      if (req.user.campusID && doc.campusID._id.toString() !== req.user.campusID.toString()) {
        return res.status(403).json({ success: false, error: "Not authorized to view this member." });
      }
      return res.json({ success: true, doc });
    } else {
      return res.status(404).json({ success: false, error: "Member does not exist" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getMemberByUserId = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: userID");
  }
  try {
    const doc = await CanteenModel.findOne({ userID: req.params.id }).populate('campusID', 'name');
    if (doc) {
      // Campus check for admin
      if (req.user.campusID && doc.campusID._id.toString() !== req.user.campusID.toString()) {
        return res.status(403).json({ success: false, error: "Not authorized to view this member." });
      }
      return res.json({ success: true, doc });
    } else {
      return res.status(404).json({ success: false, error: "Member does not exist" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.createMember = async (req, res) => {
  try {
    const { userID } = req.body;
    const userExists = await StudentModel.findOne({ userID }) || await TeacherModel.findOne({ userID });
    if (!userExists) {
      return res.status(404).json({ success: false, error: "User ID does not exist" });
    }

    const memberExists = await CanteenModel.findOne({ userID });
    if (memberExists) {
      return res.status(409).json({ success: false, error: "Member already exists" });
    }

    const currentYear = new Date().getFullYear();
    const count = await CanteenModel.countDocuments();
    const memberID = `CA${currentYear}${count + 1}`;

    const doc = await CanteenModel.create({
      ...req.body,
      memberID,
      campusID: userExists.campusID, // Automatically add campusID from the user record
    });
    res.status(201).json({ success: true, user: doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.makePayment = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: memberID");
  }
  try {
    const doc = await CanteenModel.findOneAndUpdate(
      { memberID: req.params.id },
      { $push: { payments: req.body } },
      { new: true, runValidators: true }
    );
    if (!doc) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateMember = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: memberID");
  }
  try {
    const doc = await CanteenModel.findOneAndUpdate({ memberID: req.params.id }, req.body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteMember = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: memberID");
  }
  try {
    const doc = await CanteenModel.findOneAndDelete({ memberID: req.params.id });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }
    res.json({ success: true, message: "Member deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};