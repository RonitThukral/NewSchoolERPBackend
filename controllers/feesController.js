
exports.getAllFees = async (req, res) => {
  const { user, query } = req;
  try {
    const FeesModel = await req.getModel('fees');

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

    const docs = await FeesModel.find(campusFilter)
      .populate('campusID', 'name')
      .populate('applicableClasses', 'name classCode')
      .sort({ createdAt: "desc" });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getFeeTypes = async (req, res) => {
  try {
    const FeesModel = await req.getModel('fees');
    // This route now correctly returns the names of all fee structures
    const docs = await FeesModel.find().select("name");
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getFeeById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
  }
  try {
    const FeesModel = await req.getModel('fees');
    const doc = await FeesModel.findById(req.params.id).populate('campusID', 'name').populate('applicableClasses', 'name classCode');
    if (doc) {
      return res.json(doc);
    } else {
      return res.status(404).json({ success: false, error: "Fee structure not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.createFeeStructure = async (req, res) => {
  try {
    const FeesModel = await req.getModel('fees');
    const feeData = req.body;

    // Automatically calculate totalAmount from the feeItems array
    if (feeData.feeItems && Array.isArray(feeData.feeItems)) {
      feeData.totalAmount = feeData.feeItems.reduce((total, item) => total + (item.amount || 0), 0);
    } else {
      return res.status(400).json({ success: false, error: "feeItems array is required." });
    }

    const doc = await FeesModel.create(feeData);

    // Populate the references before sending response
    await doc.populate('campusID', 'name');
    await doc.populate('applicableClasses', 'name classCode');

    res.status(201).json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateFeeStructure = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
  }
  try {
    const FeesModel = await req.getModel('fees');
    const updateData = req.body;
    // If feeItems are being updated, recalculate the totalAmount
    if (updateData.feeItems && Array.isArray(updateData.feeItems)) {
      updateData.totalAmount = updateData.feeItems.reduce((total, item) => total + (item.amount || 0), 0);
    }

    const doc = await FeesModel.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('campusID', 'name')
      .populate('applicableClasses', 'name classCode');

    if (!doc) {
      return res.status(404).json({ success: false, error: "Fee structure not found" });
    }
    res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteFeeById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
  }
  try {
    const FeesModel = await req.getModel('fees');
    const doc = await FeesModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Fee structure not found" });
    }
    res.json({ success: true, message: "Fee structure deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};