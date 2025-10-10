const express = require("express");
const SSNITModel = require("../models/SSNITModel");
const TeacherModel = require("../models/TeacherModel");
const PayrowModel = require("../models/PayRow.Model");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

route.get("/", protect, authorize("admin"), async (req, res) => {
  const { user, query } = req;
  try {
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) { // Campus Admin
      // Admins default to their own campus, but can view others via query param
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // Global Admin filtering
      campusFilter.campusID = query.campusID;
    }

    const data = await SSNITModel.find(campusFilter)
      .populate('campusID', 'name').sort({ createdAt: "desc" });
    res.json(data);
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
    const doc = await SSNITModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "SSNIT record not found" });
    }
    // Campus check for admin
    if (req.user.campusID && doc.campusID.toString() !== req.user.campusID._id.toString()) {
      return res.status(403).json({ success: false, error: "Not authorized to view this SSNIT record." });
    }
    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//get student results
route.get("/teacher/:year/:month/:id", protect, authorize("admin", "teacher"), async (req, res) => {
  try {
    const { year, month, id: userID } = req.params;
    const ssnitDocs = await SSNITModel.find({ year, month, "teachers.userID": userID });
    if (!ssnitDocs.length) {
      return res.status(404).json({ success: false, error: "No data found for this period." });
    }
    const results = ssnitDocs.flatMap(doc => doc.teachers.filter(teacher => teacher.userID === userID));
    res.json({ success: true, docs: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//get class course
route.get("/teachers/:year/:month", protect, authorize("admin"), async (req, res) => {
  try {
    const { year, month, campusID: queryCampusID } = req.params;
    const { user } = req;

    // Global admin can query any campus, Campus admin is restricted to their own.
    let campusIdToQuery = !user.campusID ? queryCampusID : user.campusID?._id;
    if (!campusIdToQuery) {
      return res.status(400).json({ success: false, error: "Campus ID is required for this operation." });
    }

    let ssnitDoc = await SSNITModel.findOne({ year, month, campusID: campusIdToQuery });

    if (ssnitDoc) {
      return res.json({ success: true, docs: ssnitDoc });
    }

    // Fetch teachers only from the relevant campus
    const teachers = await TeacherModel.find({ isStaff: true, employmentStatus: 'active', campusID: campusIdToQuery });
    const payrows = await PayrowModel.find();
    const payrowMap = new Map(payrows.map(p => [p.code, p]));

    const newTeachersData = teachers.map(teacher => {
      const payrow = payrowMap.get(teacher.role);
      const salary = payrow ? payrow.basicSalary : 0;
      return {
        name: `${teacher.name} ${teacher.surname}`,
        userID: teacher.userID,
        position: teacher.role,
        SSNITNumber: teacher.taxNumber,
        salary: salary,
        contribution: salary * 0.05, // Assuming 5%
      };
    });

    const newSsnitDoc = await SSNITModel.create({
      year,
      month,
      percentage: 5,
      campusID: campusIdToQuery, // Ensure new record is campus-specific
      teachers: newTeachersData,
    });

    res.status(201).json({ success: true, docs: newSsnitDoc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//create
route.post("/create", protect, authorize("admin"), async (req, res) => {
  try {
    const doc = await SSNITModel.create(req.body);
    res.status(201).json({ success: true, doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

//edit task
route.put("/update/:id", protect, authorize("admin"), async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
    }
    const doc = await SSNITModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "SSNIT record not found" });
    }
    res.json({ success: true, doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

//delete task
route.delete("/delete/:id", protect, authorize("admin"), async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
    }
    const doc = await SSNITModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "SSNIT record not found" });
    }
    res.json({ success: true, message: "SSNIT record deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = route;
