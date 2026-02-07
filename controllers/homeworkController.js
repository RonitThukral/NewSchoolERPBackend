const cloudinary = require("../middlewares/cloudinary");
const streamifier = require("streamifier");

exports.getAllHomeworks = async (req, res) => {
  const { user, query } = req;
  try {
    const homeworkModel = await req.getModel('homeworks');

    // Build the campus filter based on user role
    let filter = {};
    if (user.campusID) { // This is a Campus Admin
      const campusId = query.campusID || user.campusID?._id || user.campusID;
      if (campusId) filter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin / Super Admin
      filter.campusID = query.campusID;
    }

    // Teacher-specific filtering
    if (user.role === 'teacher') {
      filter.teacherID = user._id;
    }

    const data = await homeworkModel.find(filter)
      .populate('classID', 'name')
      .populate('courseID', 'name')
      .populate('teacherID', 'name surname userID')
      .sort({ createdAt: "desc" });

    res.json(data);
  } catch (err) {
    console.error("Fetch All Homeworks Error:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getHomeworkById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
  }
  try {
    const homeworkModel = await req.getModel('homeworks');
    const doc = await homeworkModel.findById(req.params.id)
      .populate('classID', 'name')
      .populate('courseID', 'name')
      .populate('teacherID', 'name surname userID');
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
    return res.status(400).json({ success: false, error: "Missing URL parameter: classID" });
  }
  try {
    const homeworkModel = await req.getModel('homeworks');
    const ClassesModel = await req.getModel('classes');

    // --- CAMPUS AUTHORIZATION ---
    if (user.campusID) {
      const classDoc = await ClassesModel.findById(req.params.classID).select('campusID').lean();
      if (!classDoc) {
        return res.status(404).json({ success: false, error: "Class not found." });
      }
      const myCampusId = user.campusID._id || user.campusID;
      if (classDoc.campusID.toString() !== myCampusId.toString()) {
        return res.status(403).json({ success: false, error: "You are not authorized to view homework for this campus." });
      }
    }
    const docs = await homeworkModel.find({ classID: req.params.classID })
      .populate('courseID', 'name')
      .populate('teacherID', 'name surname');

    res.json({ success: true, homeworks: docs || [] });
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
  const { title, classID, courseID, teacherID } = req.body;
  if (!title || !classID || !courseID || !teacherID) {
    return res.status(400).json({ success: false, error: "Missing required fields: title, courseID, teacherID, or classID" });
  }

  try {
    const homeworkModel = await req.getModel('homeworks');
    const ClassesModel = await req.getModel('classes');

    // Find the campusID from the class to ensure data integrity
    const classDoc = await ClassesModel.findById(classID).select('campusID').lean();
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
      campusID: campusID,
    };

    const homework = await homeworkModel.create(homeworkData);

    // Populate before returning
    const populatedHomework = await homeworkModel.findById(homework._id)
      .populate('classID', 'name')
      .populate('courseID', 'name')
      .populate('teacherID', 'name surname');

    res.status(201).json({ success: true, doc: populatedHomework });
  } catch (error) {
    console.error("Homework creation error:", error);
    res.status(500).json({ success: false, error: error.message || "Homework creation failed" });
  }
};

exports.updateHomework = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
  }

  try {
    const homeworkModel = await req.getModel('homeworks');
    const homeworkData = await homeworkModel.findById(req.params.id);
    if (!homeworkData) {
      return res.status(404).json({ success: false, error: "Homework not found" });
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
      updatedData.attachments = [...(homeworkData.attachments || []), ...newAttachments];
    }

    const doc = await homeworkModel.findByIdAndUpdate(req.params.id, updatedData, { new: true })
      .populate('classID', 'name')
      .populate('courseID', 'name');

    return res.json({ success: true, doc });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Update failed", details: error.message });
  }
};

exports.deleteHomework = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
  }
  try {
    const homeworkModel = await req.getModel('homeworks');
    const doc = await homeworkModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Homework not found" });
    }
    res.json({ success: true, message: "Homework deleted successfully", id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};