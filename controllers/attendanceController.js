const mongoose = require("mongoose");
const { isAuthorized } = require("./sbaController"); // Re-using the authorization logic

exports.getAllAttendance = async (req, res) => {
  const { user, query } = req;
  try {
    const AttendanceModel = await req.getModel('attendance');

    // Build filter based on query and user permissions
    let filter = {};

    // 1. Campus Isolation
    if (user.campusID) {
      filter.campusID = user.campusID._id || user.campusID;
    } else if (query.campusID) {
      filter.campusID = query.campusID;
    }

    // 2. Specific Filters
    if (query.date) filter.date = new Date(query.date);
    if (query.classID) filter.classID = query.classID;
    if (query.attendeeType) filter.attendeeType = query.attendeeType;

    // Fetch and populate
    const docs = await AttendanceModel.find(filter)
      .populate('classID', 'name classCode')
      .populate({
        path: 'attendees.attendee',
        select: 'name surname userID'
      })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, docs });
  } catch (err) {
    console.error("Fetch All Attendance Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAttendanceByUser = async (req, res) => {
  // Use the MongoDB _id from the URL parameter, which is more reliable
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: "Missing or invalid URL parameter: id" });
  }

  try {
    const AttendanceModel = await req.getModel('attendance');
    // The user's _id is directly available from the URL
    const userObjectId = new mongoose.Types.ObjectId(id);

    // Find all attendance records where this user is listed as an attendee
    const attendanceRecords = await AttendanceModel.find({ "attendees.attendee": userObjectId })
      .populate('classID', 'name')
      .sort({ date: -1 })
      .lean();

    // Filter out just the specific user's status from each record
    const userAttendance = attendanceRecords.map(record => {
      const myRecord = record.attendees.find(att => att.attendee.toString() === id);
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
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAttendanceByClassAndDate = async (req, res) => {
  const { classID, date } = req.params;
  if (!classID || !date) {
    return res.status(400).json({ success: false, error: "Missing URL parameters: classID or date" });
  }

  try {
    const ClassesModel = await req.getModel('classes');
    const StudentModel = await req.getModel('students');
    const AttendanceModel = await req.getModel('attendance');

    const classObjectId = new mongoose.Types.ObjectId(classID);
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
      const myCampusId = user.campusID._id || user.campusID;
      if (classDoc.campusID.toString() !== myCampusId.toString()) {
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
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createOrUpdateStudentAttendance = async (req, res) => {
  const { classID, date, attendees, academicYear, term } = req.body;
  const recordedBy = req.user._id; // Get recorder from logged-in user

  if (!classID || !date || !attendees || !academicYear || !term) {
    return res.status(400).json({ success: false, error: "Missing required fields: classID, date, attendees, academicYear, term" });
  }

  // Map incoming attendees to the correct schema format
  const attendeesToSave = attendees.map(({ studentID, status, remarks }) => ({
    attendee: studentID,
    status,
    remarks: remarks || ''
  }));

  try {
    const ClassesModel = await req.getModel('classes');
    const AttendanceModel = await req.getModel('attendance');

    const classObjectId = new mongoose.Types.ObjectId(classID);
    const attendanceDate = new Date(date);

    const classDoc = await ClassesModel.findById(classObjectId).select('campusID').lean();
    if (!classDoc) {
      return res.status(404).json({ success: false, error: "Class not found. Cannot save attendance." });
    }
    const campusID = classDoc.campusID;

    const recordedByType = ['admin', 'super-admin'].includes(req.user.role) ? 'nonteachers' : 'teachers';

    // Use findOneAndUpdate with upsert to either update existing or create new
    // We explicitly cast date to ensure it matches the Date type in schema
    const doc = await AttendanceModel.findOneAndUpdate(
      { classID: classObjectId, date: attendanceDate },
      {
        $set: {
          classID: classObjectId,
          date: attendanceDate,
          attendees: attendeesToSave,
          academicYear,
          term,
          recordedBy,
          recordedByType,
          attendeeType: "students",
          campusID: campusID // Ensure it's always set/updated
        }
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Return doc and success
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error("Attendance Save Error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "A record for this class and date already exists." });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createOrUpdateStaffAttendance = async (req, res) => {
  // Staff attendance is campus-wide, not class-specific
  const { campusID, date, attendees, academicYear, term } = req.body;
  const recordedBy = req.user._id; // Get recorder from logged-in user

  if (!campusID || !date || !attendees || !academicYear || !term) {
    return res.status(400).json({ success: false, error: "Missing required fields: campusID, date, attendees, academicYear, term" });
  }

  // Map incoming attendees to the correct schema format
  const attendeesToSave = attendees.map(({ teacherID, status, remarks }) => ({
    attendee: teacherID,
    status,
    remarks: remarks || ''
  }));

  try {
    const AttendanceModel = await req.getModel('attendance');
    const recordedByType = ['admin', 'super-admin'].includes(req.user.role) ? 'nonteachers' : 'teachers';

    // The `upsert: true` option will create a new document if one doesn't exist for the campus and date.
    const doc = await AttendanceModel.findOneAndUpdate(
      { campusID, date, attendeeType: "teachers" },
      {
        $set: {
          campusID,
          date,
          attendees: attendeesToSave,
          academicYear,
          term,
          recordedBy,
          recordedByType,
          attendeeType: "teachers"
        }
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "A staff attendance record for this campus and date already exists." });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};