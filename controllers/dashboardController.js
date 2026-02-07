// Removed static requires as we use tenant-aware models via getModel helper.
const { role } = require("../middlewares/variables");
const moment = require("moment");

exports.getStaffDashboardCounts = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: staff ID" });
    }
    const TeacherModel = await req.getModel('teachers');
    const NotificationsModel = await req.getModel('notices');
    const AttendanceModel = await req.getModel('attendances');

    const staff = await TeacherModel.findOne({
      role: role.Teacher,
      userID: req.params.id,
    });

    if (!staff) {
      return res.status(404).json({ success: false, error: "Staff not found" });
    }

    const notifications = await NotificationsModel.countDocuments({
      status: 'active', // Adjust based on schema
      publishDate: { $lte: new Date() },
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
        classes: staff?.classID ? 1 : 0,
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

    const StudentModel = await req.getModel('students');
    const NotificationsModel = await req.getModel('notices');
    const AttendanceModel = await req.getModel('attendances');

    const student = await StudentModel.findOne({
      role: role.Student,
      userID: req.params.id,
    });

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const notifications = await NotificationsModel.countDocuments({
      status: 'active',
      publishDate: { $lte: new Date() },
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
  const { user, query } = req;
  try {
    const StudentModel = await req.getModel('students');
    const TeacherModel = await req.getModel('teachers');
    const ClassesModel = await req.getModel('classes');
    const PrefectsModel = await req.getModel('prefects');
    const CoursesModel = await req.getModel('courses');
    const ScholarshipsModel = await req.getModel('scholarships');
    const CampusModel = await req.getModel('campus');

    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) {
      const campusId = query.campusID || (user.campusID && user.campusID._id ? user.campusID._id : user.campusID);
      if (campusId && campusId !== 'undefined' && campusId !== 'null') campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) {
      if (query.campusID !== 'undefined' && query.campusID !== 'null') campusFilter.campusID = query.campusID;
    }

    const studentQuery = { role: role.Student, enrollmentStatus: "active", ...campusFilter };
    const staffQuery = { isStaff: true, ...campusFilter };
    const classQuery = { isArchived: false, ...campusFilter };

    const [
      students,
      femaleStudents,
      maleStudents,
      staff,
      femaleStaff,
      maleStaff,
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
      ClassesModel.countDocuments(classQuery),
      PrefectsModel.countDocuments(campusFilter),
      CoursesModel.countDocuments(campusFilter),
      ScholarshipsModel.countDocuments({ ...campusFilter }),
    ]);

    // Global admin sees all campuses count, Campus admin sees 1.
    const campusesCount = !user.campusID ? await CampusModel.countDocuments({}) : 1;

    res.json({
      students,
      staff,
      campuses: campusesCount,
      scholarships,
      classes,
      courses,
      prefects,
      femaleStudents,
      maleStudents,
      femaleStaff,
      maleStaff,
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ success: false, error: err.message || "Server Error" });
  }
};