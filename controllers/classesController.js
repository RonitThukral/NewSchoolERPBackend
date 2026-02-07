const { stringtoLowerCaseSpace } = require("../middlewares/utils");
const mongoose = require('mongoose');

exports.getActiveClasses = async (req, res) => {
  const { user, query } = req;
  try {
    const ClassesModel = await req.getModel('classes');
    const CoursesModel = await req.getModel('courses');

    let filter = { isArchived: false };

    // Teacher-specific filter: Show classes where they are the main teacher OR assigned to a course
    if (user.role === 'teacher') {
      const teacherObjectId = new mongoose.Types.ObjectId(user._id);

      // Find classes where teacher teaches any course
      const teacherCourses = await CoursesModel.find({
        'classAssignments.teacherID': teacherObjectId
      }).select('classAssignments.classID').lean();

      const assignedClassIds = new Set();
      teacherCourses.forEach(course => {
        if (course.classAssignments) {
          course.classAssignments.forEach(assignment => {
            if (assignment.classID && assignment.teacherID && assignment.teacherID.toString() === user._id.toString()) {
              assignedClassIds.add(assignment.classID.toString());
            }
          });
        }
      });

      // Also respect campus if they have one
      if (user.campusID) {
        filter.campusID = user.campusID._id || user.campusID;
      }

      filter.$or = [
        { teacherID: teacherObjectId },
        { _id: { $in: Array.from(assignedClassIds).map(id => new mongoose.Types.ObjectId(id)) } }
      ];
    } else if (user.role === 'admin' && user.campusID) {
      // This is a Campus Admin - restrict to their assigned campus only
      filter.campusID = user.campusID._id || user.campusID;
    } else if (query.campusID && query.campusID !== 'undefined' && query.campusID !== 'null') {
      // This is a Super Admin or similar, filtering by a specific campus
      filter.campusID = query.campusID;
    }

    const docs = await ClassesModel.find(filter)
      .populate('teacherID', 'name surname userID')
      .sort({ createdAt: "desc" })
      .lean();

    // Default to returning an empty array if nothing found
    res.json(docs || []);
  } catch (err) {
    console.error("Fetch Active Classes Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllClasses = async (req, res) => {
  const { user, query } = req;
  try {
    const ClassesModel = await req.getModel('classes');
    let campusFilter = {};
    if (user.role === 'admin' && user.campusID) {
      campusFilter.campusID = user.campusID._id || user.campusID;
    } else if (query.campusID && query.campusID !== 'undefined' && query.campusID !== 'null') {
      campusFilter.campusID = query.campusID;
    }

    const docs = await ClassesModel.find(campusFilter)
      .populate('teacherID', 'name surname userID')
      .sort({ createdAt: "desc" })
      .lean();
    res.json(docs);
  } catch (err) {
    console.error("Fetch All Classes Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPastClasses = async (req, res) => {
  const { user, query } = req;
  try {
    const ClassesModel = await req.getModel('classes');
    let campusFilter = {};
    if (user.role === 'admin' && user.campusID) {
      campusFilter.campusID = user.campusID._id || user.campusID;
    } else if (query.campusID && query.campusID !== 'undefined' && query.campusID !== 'null') {
      campusFilter.campusID = query.campusID;
    }

    const docs = await ClassesModel.find({ isArchived: true, ...campusFilter })
      .populate('teacherID', 'name surname userID')
      .sort({ createdAt: "desc" })
      .lean();
    res.json(docs);
  } catch (err) {
    console.error("Fetch Past Classes Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getClassById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const ClassesModel = await req.getModel('classes');
    const doc = await ClassesModel.findById(req.params.id);
    if (doc) {
      return res.json({ success: true, doc });
    } else {
      return res.status(404).json({ success: false, error: "Class not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getClassesByTeacher = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: teacherID");
  }
  try {
    const ClassesModel = await req.getModel('classes');
    const docs = await ClassesModel.find({ teacherID: req.params.id });
    res.json({ success: true, docs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.createClass = async (req, res) => {
  try {
    const ClassesModel = await req.getModel('classes');
    const { name, classCode } = req.body;
    const code = stringtoLowerCaseSpace(classCode);

    const classExist = await ClassesModel.findOne({ classCode: code });
    if (classExist) {
      return res.status(409).json({ success: false, error: "Class code already exists" });
    }

    let doc = await ClassesModel.create({ ...req.body, classCode: code, name });
    doc = await ClassesModel.findById(doc._id).populate('teacherID', 'name surname userID').lean();
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateClass = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const ClassesModel = await req.getModel('classes');
    const doc = await ClassesModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('teacherID', 'name surname userID')
      .lean();
    if (!doc) {
      return res.status(404).json({ success: false, error: "Class not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteClass = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const ClassesModel = await req.getModel('classes');
    const doc = await ClassesModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Class deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};