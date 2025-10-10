const CoursesModel = require("../models/CoursesModel");
const { stringtoLowerCase } = require("../middlewares/utils");
const ClassesModel = require("../models/ClassesModel");

exports.getAllCourses = async (req, res) => {
  const { user, query } = req;
  try {
    let filter = {};
    let campusIdToQuery = null;

    if (user.campusID) { // This is a Campus Admin
      // Campus admins can view their own campus or another if they query for it
      campusIdToQuery = query.campusID || user.campusID?._id;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      campusIdToQuery = query.campusID;
    }

    // If we have a campus to filter by, find the classes within that campus
    if (campusIdToQuery) {
      const classesInCampus = await ClassesModel.find({ campusID: campusIdToQuery }).select('_id');
      const classIds = classesInCampus.map(c => c._id);
      filter['classAssignments.classID'] = { $in: classIds };
    }
    const docs = await CoursesModel.find(filter).sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getCourseById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await CoursesModel.findById(req.params.id);
    if (doc) {
      return res.json({ success: true, doc });
    } else {
      return res.status(404).json({ success: false, error: "Course not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getCoursesByClass = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: classID");
  }
  try {
    const docs = await CoursesModel.find({ "classAssignments.classID": req.params.id });
    res.json({ success: true, docs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getCoursesByTeacher = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: teacherID");
  }
  try {
    const docs = await CoursesModel.find({ "classAssignments.teacherID": req.params.id });
    res.json({ success: true, docs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { name, code } = req.body;
    const courseCode = stringtoLowerCase(code);

    const courseExist = await CoursesModel.findOne({ name, code: courseCode });
    if (courseExist) {
      return res.status(409).json({ success: false, error: "Course already exists" });
    }

    const doc = await CoursesModel.create({ ...req.body, code: courseCode });
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.assignCourseToClass = async (req, res) => {
  const { id: courseId } = req.params;
  const { classID, teacherID } = req.body;

  if (!classID || !teacherID) {
    return res.status(400).json({ success: false, error: "classID and teacherID are required." });
  }

  try {
    const course = await CoursesModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }

    // Add the new assignment
    course.classAssignments.push({ classID, teacherID });
    await course.save();

    res.json({ success: true, message: "Course assigned successfully.", doc: course });
  } catch (err) {
    console.error("Error assigning course:", err);
    res.status(500).json({ success: false, error: "Server error while assigning course." });
  }
};

exports.updateCourse = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await CoursesModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteCourse = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await CoursesModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }
    res.json({ success: true, message: "Course deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};