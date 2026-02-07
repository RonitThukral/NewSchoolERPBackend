const bcrypt = require("bcrypt");
const { login, changePassword } = require("../middlewares/validate");
const { role } = require("../middlewares/variables");
const fs = require("fs");
const xlsx = require("xlsx");

exports.getAllStaff = async (req, res) => {
  const { user, query } = req;
  try {
    const TeacherModel = await req.getModel('teachers');
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      const campusId = query.campusID || (user.campusID && user.campusID._id ? user.campusID._id : user.campusID);
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      campusFilter.campusID = query.campusID;
    }

    const data = await TeacherModel.find({ isStaff: true, ...campusFilter }).sort({ createdAt: "desc" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllTeachers = async (req, res) => {
  const { user, query } = req;
  try {
    const TeacherModel = await req.getModel('teachers');
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.role === 'admin' && user.campusID) {
      // This is a Campus Admin - restrict to their assigned campus only
      campusFilter.campusID = user.campusID._id || user.campusID;
    } else if (query.campusID && query.campusID !== 'undefined' && query.campusID !== 'null') {
      // This is a Super Admin or similar, filtering by a specific campus
      campusFilter.campusID = query.campusID;
    }

    const data = await TeacherModel.find({ role: role.Teacher, ...campusFilter })
      .select('name surname userID role campusID email profileUrl')
      .sort({ createdAt: "desc" })
      .lean();
    res.json(data);
  } catch (err) {
    console.error("Fetch Teachers Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const TeacherModel = await req.getModel('teachers');
    const user = await TeacherModel.findOne({ userID: req.params.id });
    if (user) {
      return res.json({ success: true, teacher: user });
    }
    res.status(404).json({ success: false, error: "Staff does not exist" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getTeacherBankDetails = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: bank");
  }

  const getSalary = async (positionCode, req) => {
    const PayrowModel = await req.getModel('payrows');
    const payrow = await PayrowModel.findOne({ code: positionCode });
    if (payrow) {
      return Number(payrow.salary || 0) + Number(payrow.allowance || 0) + Number(payrow.bonus || 0);
    }
    return 0;
  };

  try {
    const TeacherModel = await req.getModel('teachers');
    const users = await TeacherModel.find({ isStaff: true, bank: req.params.id });
    const data = await Promise.all(
      users.map(async (e) => ({
        bank: e.bank,
        name: `${e.name} ${e.surname}`,
        accountNumber: e.accountNumber,
        salary: await getSalary(e.position, req),
        _id: e._id,
      }))
    );
    res.json({ success: true, docs: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getTeacherCourses = async (req, res) => {
  try {
    const TeacherModel = await req.getModel('teachers');
    const user = await TeacherModel.findOne({ userID: req.params.id, role: role.Teacher });
    if (user) {
      return res.json({ success: true, docs: user?.courses });
    }
    res.status(404).json({ success: false, error: "Teacher does not exist" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const TeacherModel = await req.getModel('teachers');
    const { telephone } = req.body;

    const telephoneExist = await TeacherModel.findOne({ telephone });
    if (telephoneExist) {
      return res.status(409).json({ success: false, error: "Telephone already exists" });
    }

    // --- ROBUST User ID Generation ---
    let userID;
    const currentYear = new Date().getFullYear();
    let isUnique = false;
    let counter = await TeacherModel.countDocuments({});
    while (!isUnique) {
      // Start with a higher base number to avoid initial collisions
      counter++;
      const potentialUserID = `TK${currentYear}${10 + counter}`;
      const userIDExist = await TeacherModel.findOne({ userID: potentialUserID });
      if (!userIDExist) {
        userID = potentialUserID;
        isUnique = true;
      }
    }

    const hash = await bcrypt.hash(userID, 10);
    const userData = {
      ...req.body,
      password: hash,
      userID: userID,
      role: req.body.role || "teacher",
    };

    const user = await TeacherModel.create(userData);
    res.status(201).json({ success: true, teacher: user });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "A teacher with this User ID or Email already exists." });
    }
    res.status(500).json({ success: false, error: "Something went wrong", details: err.message });
  }
};

exports.signInTeacher = async (req, res) => {
  const { error } = login.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const TeacherModel = await req.getModel('teachers');
    const user = await TeacherModel.findOne({ userID: req.body.userID });
    if (user) {
      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (isMatch) {
        return res.json({ success: true, user });
      }
    }
    res.status(401).json({ error: "Wrong Password or Teacher ID" });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.changeTeacherPassword = async (req, res) => {
  const { error } = changePassword.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const TeacherModel = await req.getModel('teachers');
    const user = await TeacherModel.findOne({ userID: req.params.id });
    if (!user) {
      return res.status(404).json({ success: false, error: "Teacher does not exist" });
    }

    const isMatch = await bcrypt.compare(req.body.oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Wrong old password" });
    }

    const hash = await bcrypt.hash(req.body.newPassword, 10);
    await TeacherModel.updateOne({ userID: req.params.id }, { password: hash });
    res.json({ success: true, message: "Password successfully changed" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const TeacherModel = await req.getModel('teachers');
    const doc = await TeacherModel.findOneAndUpdate({ userID: req.params.id }, req.body, { new: true });
    if (doc) {
      return res.json({ success: true, doc });
    }
    res.status(404).json({ success: false, error: "Teacher not found" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "Update failed. Email or Telephone already in use." });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const TeacherModel = await req.getModel('teachers');
    const doc = await TeacherModel.findOneAndDelete({ userID: req.params.id });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Teacher not found" });
    }
    res.json({ success: true, message: "Teacher deleted successfully", doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.processMappedTeacherFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded." });
  }

  // Determine Campus ID
  let targetCampusID = null;
  if (req.user.campusID) {
    targetCampusID = req.user.campusID._id;
  } else if (req.body.campusID) {
    targetCampusID = req.body.campusID;
  }

  const { columnMapping } = req.body;
  let debugInfo = { step: 'start' };

  try {
    const mapping = columnMapping ? JSON.parse(columnMapping) : null;
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Use defval to ensure we get properties for empty cells if headers exist
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    debugInfo.rowsRead = data.length;
    debugInfo.sheetName = sheetName;

    const TeacherModel = await req.getModel('teachers');
    const teachersToCreate = [];
    let teacherCounter = await TeacherModel.countDocuments({});

    const currentYear = new Date().getFullYear();

    for (const row of data) {
      // Skip row if it looks empty
      if (Object.keys(row).length === 0) continue;

      const teacherObject = {
        role: "teacher", // Default role
        nextofKin: {}
      };

      if (targetCampusID) {
        teacherObject.campusID = targetCampusID;
      }

      // If mapping provided, use it. Otherwise use auto-mapping.
      // const source = mapping || row; 

      if (mapping) {
        for (const fileHeader in mapping) {
          const modelField = mapping[fileHeader];
          if (row[fileHeader] !== undefined && modelField) {
            if (modelField.startsWith("nextofKin.")) {
              const nokField = modelField.split(".")[1];
              teacherObject.nextofKin[nokField] = row[fileHeader];
            } else {
              teacherObject[modelField] = row[fileHeader];
            }
          }
        }
      } else {
        for (const key in row) {
          if (key.startsWith("nextofKin.")) {
            const nokField = key.split(".")[1];
            teacherObject.nextofKin[nokField] = row[key];
          } else {
            teacherObject[key] = row[key];
          }
        }
      }

      // --- Fix Booleans & Data Types ---
      ['isStaff', 'ssnit'].forEach(field => {
        if (typeof teacherObject[field] === 'string') {
          teacherObject[field] = teacherObject[field].toLowerCase() === 'true';
        }
      });

      // --- Auto-generate required fields if not mapped ---
      if (!teacherObject.userID) {
        teacherCounter++;
        teacherObject.userID = `TK${currentYear}${10 + teacherCounter}`;
      }

      if (!teacherObject.password) {
        const hash = await bcrypt.hash(teacherObject.userID, 10);
        teacherObject.password = hash;
      }

      // Fallback for campusID if not set by admin but present in file
      if (!teacherObject.campusID && row['campusID']) {
        teacherObject.campusID = row['campusID'];
      }

      teachersToCreate.push(teacherObject);
    }

    debugInfo.teachersPrepared = teachersToCreate.length;

    if (teachersToCreate.length > 0) {
      let result = [];
      try {
        result = await TeacherModel.insertMany(teachersToCreate, { ordered: false });
      } catch (insertError) {
        console.error("Bulk Insert Error detail:", insertError);
        // Mongoose insertMany with ordered:false throws if any error, but attaches insertedDocs
        if (insertError.insertedDocs) {
          result = insertError.insertedDocs;
        } else {
          // If no docs inserted at all (all failed), result stays []
          debugInfo.insertError = insertError.message;
        }
      }

      res.status(201).json({
        success: true,
        message: `${result.length} teachers created successfully. (Read ${data.length} rows)`,
        createdCount: result.length,
        debug: debugInfo
      });
    } else {
      res.status(400).json({ success: false, error: "No valid teacher data processed.", debug: debugInfo });
    }

  } catch (error) {
    console.error("Error processing mapped file:", error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: "Import failed. Duplicate User ID/Email/Phone found.", debug: debugInfo });
    }
    res.status(500).json({ success: false, error: "Processing error: " + error.message, debug: debugInfo });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }
  }
};