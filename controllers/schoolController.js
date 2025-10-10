const SchoolModel = require("../models/NonTeacherModel"); // Use NonTeacherModel as it points to 'accounts'
const StudentModel = require("../models/StudentModel");
const TeacherModel = require("../models/TeacherModel");
const bcrypt = require("bcrypt");
const { login, changePassword } = require("../middlewares/validate");
const { role } = require("../middlewares/variables");
const jwt = require("jsonwebtoken");

exports.getSchoolProfile = async (req, res) => {
  try {
    const user = await SchoolModel.findOne({ role: role.Admin });
    if (user) {
      return res.json(user);
    }
    res.status(404).json({ success: false, error: "School profile not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

const getSignedJwtToken = function(id, role, campusID) {
  return jwt.sign({ id, role, campusID }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signIn = async (req, res) => {
  const { error } = login.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message, success: false });
  }

  try {
    const { userID, password } = req.body;

    // Find user in the 'accounts' collection (which includes admins, super-admins, and non-teachers)
    // Also check students and teachers collections.
    let user = await SchoolModel.findOne({ userID, role: 'admin' }).populate('campusID', 'name').lean();
    if (!user) {
      user = await StudentModel.findOne({ userID }).lean();
    }
    if (!user) {
      user = await TeacherModel.findOne({ userID }).lean();
    }

    // If no user is found, or if the password doesn't match, send a generic error.
    // This prevents timing attacks and revealing whether a userID is valid.
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials", success: false });
    }

    // Use async bcrypt.compare to avoid blocking the event loop
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials", success: false });
    }

    // If credentials are valid, create the token and send the response
    // Correctly pass the campusID for admins, handle case where it might not exist (for super-admins)
    const token = getSignedJwtToken(user._id, user.role, user.campusID?._id || null);

    // We don't want to send the password hash back to the client
    delete user.password;

    res.json({ success: true, token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong", success: false });
  }
};

exports.createOrUpdateSchoolProfile = async (req, res) => {
  try {
    const doc = await SchoolModel.findOneAndUpdate({ role: role.Admin }, req.body, { new: true, upsert: true, runValidators: true });
    res.json({ success: true, user: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong", success: false });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { userID, password, campusID } = req.body;

    if (!userID || !password) {
      return res.status(400).json({ success: false, error: "userID and password are required." });
    }

    const adminExist = await SchoolModel.findOne({ userID });
    if (adminExist) {
      return res.status(409).json({ success: false, error: "User with this userID already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const userData = {
      ...req.body,
      password: hash,
      role: 'admin', // Role is always 'admin'
      campusID: campusID || null // If campusID is not provided, it's a Global Admin
    };

    const user = await SchoolModel.create(userData);
    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

exports.changeAdminPassword = async (req, res) => {
  const { error } = changePassword.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const user = await SchoolModel.findOne({ userID: req.params.id, role: role.Admin });
    if (!user) {
      return res.status(404).json({ success: false, error: "Admin user does not exist" });
    }

    const isMatch = await bcrypt.compare(req.body.oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Wrong old password" });
    }

    const hash = await bcrypt.hash(req.body.newPassword, 10);
    await SchoolModel.updateOne({ userID: req.params.id }, { password: hash });

    res.json({ success: true, message: "Password successfully changed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};