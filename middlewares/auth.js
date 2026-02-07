const jwt = require("jsonwebtoken");

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: "Not authorized to access this route" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user based on the role stored in the token
    let user;
    if (decoded.role === 'student') {
      const StudentModel = await req.getModel('students');
      user = await StudentModel.findById(decoded.id);
    } else if (['admin', 'super-admin'].includes(decoded.role)) { // Admins are in 'accounts' collection
      const NonTeacherModel = await req.getModel('nonteachers');
      user = await NonTeacherModel.findById(decoded.id).populate('campusID', 'name');
    } else { // Teachers and other staff are in 'teachers' or 'accounts' collections
      // We check TeacherModel first now that it's a dedicated collection
      const TeacherModel = await req.getModel('teachers');
      user = await TeacherModel.findById(decoded.id);

      // If not found in teachers, check nonteachers (for other staff roles)
      if (!user) {
        const NonTeacherModel = await req.getModel('nonteachers');
        user = await NonTeacherModel.findById(decoded.id);
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Attach user to the request object
    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Not authorized to access this route" });
  }

};

// Middleware to grant access to specific roles
exports.authorize = (...args) => {
  let roles = [];
  let options = {};

  // Separate roles from potential options object
  if (args.length > 0 && typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null) {
    options = args.pop();
    roles = args;
  } else {
    roles = args;
  }

  const { checkCampus = false, getCampusIdForResource = null, ownershipCheck = null } = options;

  return async (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: "User role not available for authorization",
      });
    }

    // 1. Role-based authorization
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    // 2. Campus-aware authorization for Campus Admins
    // This check is skipped if the user is a Global Admin (user.campusID is null).
    // It only applies to Campus Admins (user.campusID exists) for non-GET requests.
    if (checkCampus && req.user.campusID && req.method !== 'GET') {
      if (typeof getCampusIdForResource !== 'function') {
        console.error(`Campus check enabled for ${req.method} ${req.originalUrl}, but getCampusIdForResource function is missing or invalid.`);
        return res.status(500).json({ success: false, error: "Server configuration error for campus authorization." });
      }

      try {
        const resourceCampusId = await getCampusIdForResource(req);

        if (!resourceCampusId) {
          console.warn(`Campus check enabled for ${req.method} ${req.originalUrl}, but resource campusID could not be determined by getCampusIdForResource.`);
          return res.status(403).json({ success: false, error: "Resource not associated with a campus or campus ID missing." });
        }

        // Compare the admin's campusID with the resource's campusID
        if (req.user.campusID._id.toString() !== resourceCampusId.toString()) {
          return res.status(403).json({
            success: false,
            error: `Admin is not authorized to modify resources outside their assigned campus.`,
          });
        }
      } catch (err) {
        console.error(`Error during getCampusIdForResource execution for ${req.method} ${req.originalUrl}:`, err);
        return res.status(500).json({ success: false, error: "Server error during campus authorization." });
      }
    }

    // 3. Ownership-based authorization
    if (typeof ownershipCheck === 'function') {
      try {
        const isOwner = await ownershipCheck(req);
        if (!isOwner) {
          return res.status(403).json({ success: false, error: "User is not authorized to perform this action on this resource." });
        }
      } catch (err) {
        console.error(`Error during ownershipCheck execution for ${req.method} ${req.originalUrl}:`, err);
        return res.status(500).json({ success: false, error: "Server error during ownership authorization." });
      }
    }

    next();
  };
};