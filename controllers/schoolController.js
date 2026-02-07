const bcrypt = require("bcrypt");
const { login, changePassword } = require("../middlewares/validate");
const { role } = require("../middlewares/variables");
const jwt = require("jsonwebtoken");

exports.getSchoolProfile = async (req, res) => {
  try {
    const SchoolModel = await req.getModel('nonteachers');
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

exports.getAllAdmins = async (req, res) => {
  try {
    // Only Super Admins (no campusID) can view all admins
    if (req.user.campusID) {
      return res.status(403).json({ success: false, error: "Access denied. Only Super Admins can view all admins." });
    }

    const SchoolModel = await req.getModel('nonteachers');
    // Find all admins (role 'admin'). Exclude password.
    const admins = await SchoolModel.find({ role: 'admin' })
      .select('-password')
      .populate('campusID', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: admins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

const getSignedJwtToken = function (id, role, campusID) {
  if (!process.env.JWT_SECRET) {
    // This provides a more helpful error message if the secret is missing.
    throw new Error('JWT_SECRET is not defined in your .env file');
  }
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

    // Get models dynamically
    const SchoolModel = await req.getModel('nonteachers');
    const StudentModel = await req.getModel('students');
    const TeacherModel = await req.getModel('teachers');
    // We MUST load the CampusModel here so that it is registered on this tenant connection.
    // Otherwise, population of 'campusID' will fail with "Schema hasn't been registered for model..."
    await req.getModel('campus');

    // Since userID is unique across all collections, we can search them in parallel.
    // This is more efficient and robust.
    const [adminUser, studentUser, teacherUser] = await Promise.all([
      SchoolModel.findOne({ userID }).populate('campusID', 'name'), // Admins are in 'accounts'
      StudentModel.findOne({ userID }).lean(),
      TeacherModel.findOne({ userID }).lean() // Teachers are now in 'teachers' collection
    ]);

    // Find the first user that matches.
    let user = adminUser || studentUser || teacherUser;

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
    // Convert to a plain object if it's a Mongoose doc, then delete the password.
    const userObject = user.toObject ? user.toObject() : user;
    delete userObject.password;

    res.json({ success: true, token, user: userObject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong", success: false });
  }
};

exports.createOrUpdateSchoolProfile = async (req, res) => {
  try {
    const SchoolModel = await req.getModel('nonteachers');
    const doc = await SchoolModel.findOneAndUpdate({ role: role.Admin }, req.body, { new: true, upsert: true, runValidators: true });
    res.json({ success: true, user: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong", success: false });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    // 1. Authorization Check: Only Super Admins (no campusID) can create other admins
    if (req.user.campusID) {
      return res.status(403).json({ success: false, error: "Only Global Super Admins can create new admins." });
    }

    const { userID, password, campusID } = req.body;

    if (!userID || !password) {
      return res.status(400).json({ success: false, error: "userID and password are required." });
    }

    const SchoolModel = await req.getModel('nonteachers');
    const adminExist = await SchoolModel.findOne({ userID });
    if (adminExist) {
      return res.status(409).json({ success: false, error: "User with this userID already exists" });
    }

    // 2. Validate Campus ID if provided
    let assignedCampusId = null;
    if (campusID) {
      const CampusModel = await req.getModel('campus');
      const campusExists = await CampusModel.findById(campusID);
      if (!campusExists) {
        return res.status(400).json({ success: false, error: "Invalid Campus ID provided." });
      }
      assignedCampusId = campusID;
    }

    const hash = await bcrypt.hash(password, 10);
    const userData = {
      ...req.body,
      password: hash,
      role: 'admin', // Role is always 'admin' for created admins
      campusID: assignedCampusId // If null, they become a Global Admin (use with caution)
    };

    const user = await SchoolModel.create(userData);

    // Remove password from response
    const userResp = user.toObject();
    delete userResp.password;

    res.status(201).json({ success: true, user: userResp });
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
    const SchoolModel = await req.getModel('nonteachers');
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