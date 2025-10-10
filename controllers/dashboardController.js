const StudentModel = require("../models/StudentModel");
const AttendanceModel = require("../models/AttendenceModel");
const CoursesModel = require("../models/CoursesModel");
const ClassesModel = require("../models/ClassesModel");
const CampusModel = require("../models/CampusesModel");
const PrefectsModel = require("../models/PrefectsModel");
const NotificationsModel = require("../models/NoticeModel");
const ScholarshipsModel = require("../models/ScholarshipsModel");
const TeacherModel = require("../models/TeacherModel");
const SmsModel = require("../models/SmsModel");
const { role } = require("../middlewares/variables");
const moment = require("moment");

exports.getStaffDashboardCounts = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: staff ID" });
    }
    const staff = await TeacherModel.findOne({
      role: role.Teacher,
      userID: req.params.id,
    });

    if (!staff) {
      return res.status(404).json({ success: false, error: "Staff not found" });
    }

    const notifications = await NotificationsModel.countDocuments({
      publishDate: { $gte: new Date() },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendance = await AttendanceModel.countDocuments({
      "attendees.attendee": staff._id,
      date: { $gte: thirtyDaysAgo },
    });

    const events = 0; // await CalendarModel.countDocuments({ start: { $gte: new Date() } });

    return res.json({
      success: true,
      count: {
        courses: staff?.courses?.length || 0,
        classes: staff?.classID ? 1 : 0, // Assuming a teacher is assigned to one main class
        attendance: attendance,
        notifications: notifications,
        events: events,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message || "Server Error" });
  }
};

exports.getStudentDashboardCounts = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: student ID" });
    }

    const student = await StudentModel.findOne({
      role: role.Student,
      userID: req.params.id,
    });

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const notifications = await NotificationsModel.countDocuments({
      publishDate: { $gte: new Date() },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendance = await AttendanceModel.countDocuments({
      "attendees.attendee": student._id,
      date: { $gte: thirtyDaysAgo },
    });

    const events = 0; // await CalendarModel.countDocuments({ start: { $gte: new Date() } });

    return res.json({
      success: true,
      count: {
        courses: student?.courses?.length || 0,
        attendance: attendance,
        notifications: notifications,
        events: events,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message || "Server Error" });
  }
};

exports.getSystemWideCounts = async (req, res) => {
  const { user } = req;
  try {
    // If the user is a Campus Admin, filter counts by their campus.
    // If the user is a Global Admin (user.campusID is null), the filter is empty, so it gets all counts.
    const campusFilter = user.campusID ? { campusID: user.campusID._id } : {};

    const studentQuery = { role: role.Student, enrollmentStatus: "active", ...campusFilter };
    const staffQuery = { isStaff: true, employmentStatus: "active", ...campusFilter };
    const classQuery = { isArchived: false, ...campusFilter };

    const [
      students,
      femaleStudents,
      maleStudents,
      staff,
      femaleStaff,
      maleStaff,
      sms,
      classes,
      prefects,
      courses,
      scholarships,
    ] = await Promise.all([
      StudentModel.countDocuments(studentQuery),
      StudentModel.countDocuments({ ...studentQuery, gender: "female" }),
      StudentModel.countDocuments({ ...studentQuery, gender: "male" }),
      TeacherModel.countDocuments(staffQuery),
      TeacherModel.countDocuments({ ...staffQuery, gender: "female" }),
      TeacherModel.countDocuments({ ...staffQuery, gender: "male" }),
      SmsModel.countDocuments({}),
      ClassesModel.countDocuments(classQuery),
      PrefectsModel.countDocuments(campusFilter), // Assuming prefects can be linked to campus via student
      CoursesModel.countDocuments({}),
      ScholarshipsModel.countDocuments({ isActive: true, ...campusFilter }),
    ]);

    // Global admin sees all campuses, Campus admin sees 1.
    const campuses = !user.campusID ? await CampusModel.countDocuments({}) : 1;

    res.json({
      students,
      staff,
      campuses,
      scholarships,
      classes,
      courses,
      prefects,
      femaleStudents,
      maleStudents,
      femaleStaff,
      maleStaff,
      smsCount: sms,
      // Birthday and registration counts can be added here with more complex queries if needed
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message || "Server Error" });
  }
};