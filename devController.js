// WARNING: FOR DEVELOPMENT USE ONLY. DO NOT EXPOSE IN PRODUCTION.

const bcrypt = require("bcrypt");

/**
 * @desc    Creates a Global Admin (no campus assigned).
 * @route   POST /dev/create-global-admin
 * @access  Public (Development Only)
 */
exports.createGlobalAdminForDev = async (req, res) => {
  try {
    const { userID, password, name } = req.body;
    if (!userID || !password || !name) {
      return res.status(400).json({ error: "userID, password, and name are required." });
    }

    const NonTeacherModel = await req.getModel('nonteachers');
    const adminExist = await NonTeacherModel.findOne({ userID });
    if (adminExist) {
      return res.status(409).json({ error: "Admin with this userID already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    // The key part: role is 'admin' and campusID is NOT set.
    const user = await NonTeacherModel.create({
      name: req.body.name,
      userID: req.body.userID,
      email: req.body.email || `${req.body.userID}@example.com`, // Ensure a unique email
      password: hash,
      role: 'admin',
      campusID: null, // Explicitly set to null for Global Admins
      surname: req.body.surname || 'Admin', // Add required fields with defaults
      gender: req.body.gender || 'other',
      position: req.body.position || 'Global Administrator'
    });

    res.status(201).json({ success: true, message: "Global Admin created for development.", user });
  } catch (err) {
    // Log the actual error for debugging purposes
    console.error("Error in createGlobalAdminForDev:", err);
    res.status(500).json({ success: false, error: "An internal server error occurred." });
  }
};

/**
 * @desc    Creates a Campus-Specific Admin.
 * @route   POST /dev/create-campus-admin
 * @access  Public (Development Only)
 */
exports.createCampusAdminForDev = async (req, res) => {
  try {
    const { userID, password, name, campusID } = req.body;
    if (!userID || !password || !name || !campusID) {
      return res.status(400).json({ error: "userID, password, name, and campusID are required." });
    }

    const NonTeacherModel = await req.getModel('nonteachers');
    const adminExist = await NonTeacherModel.findOne({ userID });
    if (adminExist) {
      return res.status(409).json({ error: "Admin with this userID already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await NonTeacherModel.create({
      name: req.body.name,
      userID: req.body.userID,
      email: req.body.email || `${req.body.userID}@example.com`, // Ensure a unique email
      campusID: req.body.campusID,
      password: hash,
      role: 'admin', // campusID is set from req.body
      surname: req.body.surname || 'Campus Admin', // Add required fields with defaults
      gender: req.body.gender || 'other',
      position: req.body.position || 'Campus Administrator'
    });

    res.status(201).json({ success: true, message: "Campus Admin created for development.", user });
  } catch (err) {
    // Log the actual error for debugging purposes
    console.error("Error in createCampusAdminForDev:", err);
    res.status(500).json({ success: false, error: "An internal server error occurred." });
  }
};