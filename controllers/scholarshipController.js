// Removed static require as we use tenant-aware models via getModel helper.

exports.getAllScholarships = async (req, res) => {
  const { user, query } = req;
  try {
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      // Admins default to their own campus, but can view others via query param
      const campusId = query.campusID || (user.campusID && user.campusID._id ? user.campusID._id : user.campusID);
      if (campusId && campusId !== 'undefined' && campusId !== 'null') campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      // Global admins can filter by any campus
      if (query.campusID !== 'undefined' && query.campusID !== 'null') campusFilter.campusID = query.campusID;
    }

    const ScholarshipModel = await req.getModel('scholarships');
    const data = await ScholarshipModel.find(campusFilter)
      .populate('campusID', 'name')
      .sort({ createdAt: "desc" })
      .lean();
    res.json(data);
  } catch (err) {
    console.error("Scholarship Fetch Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getScholarshipById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const ScholarshipModel = await req.getModel('scholarships');
    const doc = await ScholarshipModel.findById(req.params.id);
    if (doc) {
      return res.json({ success: true, doc });
    }
    res.status(404).json({ success: false, error: "Scholarship not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getScholarshipByName = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: name");
  }
  try {
    const ScholarshipModel = await req.getModel('scholarships');
    const doc = await ScholarshipModel.findOne({ name: req.params.id });
    if (doc) {
      return res.json({ success: true, doc });
    }
    res.status(404).json({ success: false, error: "Scholarship not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createScholarship = async (req, res) => {
  try {
    const ScholarshipModel = await req.getModel('scholarships');
    const doc = await ScholarshipModel.create(req.body);
    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateScholarship = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const ScholarshipModel = await req.getModel('scholarships');
    const doc = await ScholarshipModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Scholarship not found" });
    }
    res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteScholarship = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: id");
  }
  try {
    const ScholarshipModel = await req.getModel('scholarships');
    const doc = await ScholarshipModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Scholarship deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};