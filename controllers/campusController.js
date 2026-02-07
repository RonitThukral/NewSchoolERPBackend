

exports.getAllCampuses = async (req, res) => {
  const { user } = req;
  try {
    const CampusModel = await req.getModel('campus');
    let campusFilter = {};
    // If the user is a Campus Admin, only show their own campus.
    if (user.campusID) {
      campusFilter._id = user.campusID._id;
    }

    const docs = await CampusModel.find(campusFilter).sort({ createdAt: "desc" });
    // Standardized response format
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getCampusById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const CampusModel = await req.getModel('campus');
    const doc = await CampusModel.findById(req.params.id);
    if (doc) {
      return res.json({ success: true, doc });
    } else {
      return res.status(404).json({ success: false, error: "Campus not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.createCampus = async (req, res) => {
  try {
    // Check if the user is a Super Admin (no campusID)
    // If req.user.campusID exists, they are a Campus Admin and shouldn't create new campuses.
    if (req.user.campusID) {
      return res.status(403).json({ success: false, error: "Only Global Super Admins can create new campuses." });
    }

    const CampusModel = await req.getModel('campus');
    const doc = await CampusModel.create(req.body);
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateCampus = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const CampusModel = await req.getModel('campus');
    const doc = await CampusModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Campus not found" });
    }
    return res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteCampus = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const CampusModel = await req.getModel('campus');
    const doc = await CampusModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Campus not found" });
    }
    res.json({ success: true, message: "Campus deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};