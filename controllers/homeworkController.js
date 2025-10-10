const homeworkModel = require("../models/HomeWorkModel");
const cloudinary = require("../middlewares/cloudinary");
const streamifier = require("streamifier");
const ClassesModel = require("../models/ClassesModel");

exports.getAllHomeworks = async (req, res) => {
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

    const data = await homeworkModel.find(campusFilter)
      .populate('classID', 'name').populate('courseID', 'name').populate('teacherID', 'name')
      .sort({ createdAt: "desc" });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getHomeworkById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await homeworkModel.findById(req.params.id);
    if (doc) {
      return res.json({ success: true, doc });
    } else {
      return res.status(404).json({ success: false, error: "Homework not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getHomeworksByClass = async (req, res) => {
  const { user } = req;
  if (!req.params.classID) {
    return res.status(400).send("Missing URL parameter: classID");
  }
  try {
    // --- CAMPUS AUTHORIZATION ---
    // If the user is a campus admin, ensure the requested class belongs to their campus.
    if (user.campusID) { // This check only applies to Campus Admins
      const classDoc = await ClassesModel.findById(req.params.classID).select('campusID').lean();
      if (!classDoc) {
        return res.status(404).json({ success: false, error: "Class not found." });
      }
      if (classDoc.campusID.toString() !== user.campusID.toString()) {
        return res.status(403).json({ success: false, error: "You are not authorized to view homework for this campus." });
      }
    }
    const docs = await homeworkModel.find({ classID: req.params.classID });
    if (docs.length > 0) {
      return res.json({ success: true, homeworks: docs });
    } else {
      return res.status(404).json({ success: false, error: "No homeworks found for this class" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "DreamsCloudtech" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

exports.createHomework = async (req, res) => {
  if (!req.body.title || !req.body.classID || !req.body.courseID || !req.body.teacherID) {
    return res.status(400).send("Missing required fields: title, courseID, teacherID, or classID");
  }

  try {
    // Find the campusID from the class to ensure data integrity
    const classDoc = await ClassesModel.findById(req.body.classID).select('campusID').lean();
    if (!classDoc) {
      return res.status(404).json({ success: false, error: "Class not found. Cannot save homework." });
    }
    const campusID = classDoc.campusID;

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

    const homeworkData = {
      ...req.body,
      attachments: attachments,
      campusID: campusID, // Add campusID to the homework data
    };

    const homework = new homeworkModel(homeworkData);

    await homework.save();
    res.status(201).json({ success: true, homework });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "File upload failed" });
  }
};

exports.updateHomework = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }

  try {
    const homeworkData = await homeworkModel.findById(req.params.id);
    if (!homeworkData) {
      return res.status(404).send("Homework not found");
    }

    const updatedData = { ...req.body };
    const newAttachments = [];

    if (req.files) {
      for (const key in req.files) {
        for (const file of req.files[key]) {
          const result = await uploadToCloudinary(file);
          newAttachments.push({
            fileName: file.originalname,
            fileUrl: result.secure_url,
            fileType: file.mimetype,
          });
        }
      }
      // Combine existing attachments with new ones, or replace them as needed
      updatedData.attachments = [...(homeworkData.attachments || []), ...newAttachments];
    }


    const doc = await homeworkModel.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    
    return res.json({ success: true, doc });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Update failed", details: error.message });
  }
};

exports.deleteHomework = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const doc = await homeworkModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Homework not found" });
    }
    res.json({ success: true, message: "Homework deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};