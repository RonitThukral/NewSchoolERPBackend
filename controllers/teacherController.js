const TeacherModel = require("../models/TeacherModel");
const PayrowModel = require("../models/PayRow.Model");
const bcrypt = require("bcrypt");
const { login, changePassword } = require("../middlewares/validate");
const { role } = require("../middlewares/variables");
const { sendRegisterMessageToStaff } = require("../services/SmsService");

exports.getAllStaff = async (req, res) => {
  const { user, query } = req;
  try {
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      const campusId = query.campusID || user.campusID?._id;
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
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      campusFilter.campusID = query.campusID;
    }

    const data = await TeacherModel.find({ role: role.Teacher, ...campusFilter }).sort({ createdAt: "desc" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTeacherById = async (req, res) => {
  try {
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

  const getSalary = async (positionCode) => {
    const payrow = await PayrowModel.findOne({ code: positionCode });
    if (payrow) {
      return Number(payrow.salary || 0) + Number(payrow.allowance || 0) + Number(payrow.bonus || 0);
    }
    return 0;
  };

  try {
    const users = await TeacherModel.find({ isStaff: true, bank: req.params.id });
    const data = await Promise.all(
      users.map(async (e) => ({
        bank: e.bank,
        name: `${e.name} ${e.surname}`,
        accountNumber: e.accountNumber,
        salary: await getSalary(e.position),
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
      role: req.body.position,
    };

    const user = await TeacherModel.create(userData);
    if (user.telephone) {
      sendRegisterMessageToStaff(user.telephone);
    }
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
    const doc = await TeacherModel.findOneAndDelete({ userID: req.params.id });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Teacher not found" });
    }
    res.json({ success: true, message: "Teacher deleted successfully", doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};