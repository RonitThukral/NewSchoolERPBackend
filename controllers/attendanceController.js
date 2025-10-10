const AttendanceModel = require("../models/AttendenceModel");
const StudentModel = require("../models/StudentModel");
const { role } = require("../middlewares/variables");
const CoursesModel = require("../models/CoursesModel");
const ClassesModel = require("../models/ClassesModel"); // Import ClassesModel
const mongoose = require("mongoose");
const { isAuthorized } = require("./sbaController"); // Re-using the authorization logic

exports.getAllAttendance = async (req, res) => {
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

    const docs = await AttendanceModel.find(campusFilter).sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getAttendanceByUser = async (req, res) => {
  const { userID } = req.params;
  if (!userID) {
    return res.status(400).json({ success: false, error: "Missing URL parameter: userID" });
  }

  try {
    // Find the user's _id first
    const user = await StudentModel.findOne({ userID }).select('_id') || await TeacherModel.findOne({ userID }).select('_id');
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Find all attendance records where this user is listed as an attendee
    const attendanceRecords = await AttendanceModel.find({ "attendees.attendee": user._id })
      .populate('classID', 'name')
      .sort({ date: -1 })
      .lean();

    // Filter out just the specific user's status from each record
    const userAttendance = attendanceRecords.map(record => {
      const myRecord = record.attendees.find(att => att.attendee.toString() === user._id.toString());
      return {
        date: record.date,
        className: record.classID ? record.classID.name : 'N/A',
        status: myRecord.status,
        remarks: myRecord.remarks
      };
    });

    res.json({ success: true, attendance: userAttendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getAttendanceByClassAndDate = async (req, res) => {
  const { classID, date } = req.params;
  if (!classID || !date) {
    return res.status(400).json({ success: false, error: "Missing URL parameters: classID or date" });
  }

  try {
    const classObjectId = mongoose.Types.ObjectId(classID);
    const attendanceDate = new Date(date);
    const { user } = req; // Get the logged-in user from the protect middleware

    // --- CAMPUS AUTHORIZATION ---
    // If the user is a campus admin, ensure the requested class belongs to their campus.
    // Global admins (no campusID) can view any campus.
    if (user.campusID) { // This check only applies to Campus Admins
      const classDoc = await ClassesModel.findById(classObjectId).select('campusID').lean();
      if (!classDoc) {
        return res.status(404).json({ success: false, error: "Class not found." });
      }
      if (classDoc.campusID.toString() !== user.campusID.toString()) {
        return res.status(403).json({ success: false, error: "You are not authorized to view attendance for this campus." });
      }
    }

    // 1. Get all active students for the class
    const students = await StudentModel.find({
      classID: classObjectId,
      enrollmentStatus: 'active',
    }).select('name surname userID').lean();

    const attendanceRecord = await AttendanceModel.findOne({
      classID: classObjectId,
      date: attendanceDate,
    }).lean();

    if (attendanceRecord) {
      // 2a. If a record exists, merge the student list with the saved attendance statuses
      const attendeeMap = new Map(attendanceRecord.attendees.map(att => [att.attendee.toString(), att]));
      const mergedAttendees = students.map(student => {
        const savedStatus = attendeeMap.get(student._id.toString());
        return {
          attendee: student._id,
          name: `${student.name} ${student.surname}`,
          userID: student.userID,
          status: savedStatus ? savedStatus.status : 'present', // Default to 'present' if a student was added to class after attendance was taken
          remarks: savedStatus ? savedStatus.remarks : ''
        };
      });

      const doc = { ...attendanceRecord, attendees: mergedAttendees };
      return res.json({ success: true, doc });
    }

    // 2b. If no record exists, create a new template for the frontend to use
    const newTemplate = {
      classID: classObjectId,
      date: attendanceDate,
      attendeeType: "students",
      attendees: students.map((student) => ({
        attendee: student._id,
        name: `${student.name} ${student.surname}`,
        userID: student.userID,
        status: "present",
        remarks: ""
      })),
    };

    res.json({ success: true, doc: newTemplate, isNew: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.createOrUpdateAttendance = async (req, res) => {
  const { classID, date, attendees, academicYear, term, recordedBy } = req.body;

  if (!classID || !date || !attendees || !academicYear || !term || !recordedBy) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    // --- AUTHORIZATION (Admin can do anything, Teacher must be assigned) ---
    // A full authorization check similar to sbaController would go here.
    
    // Find the campusID from the class to ensure data integrity
    const classDoc = await ClassesModel.findById(classID).select('campusID').lean();
    if (!classDoc) {
      return res.status(404).json({ success: false, error: "Class not found. Cannot save attendance." });
    }
    const campusID = classDoc.campusID;

    // The `upsert: true` option will create a new document if one doesn't exist for the classID and date.
    const doc = await AttendanceModel.findOneAndUpdate(
      { classID, date },
      // We only want to save the fields defined in the schema, not extra fields like 'name'
      // On insert, set the campusID
      { $setOnInsert: { campusID: campusID }, 
        $set: { classID, date, attendees: attendees.map(({ attendee, status, remarks }) => ({ attendee, status, remarks })), academicYear, term, recordedBy, attendeeType: "students" }
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "A record for this class and date already exists. Use update instead." });
    }
    res.status(500).json({ success: false, error: "Server error" });
  }
};