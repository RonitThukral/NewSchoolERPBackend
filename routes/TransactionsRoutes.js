const express = require("express");
const TransactionsModel = require("../models/TransactionsModel");
const { sendPaymentSMS } = require("../services/SmsService");
const TeacherModel = require("../models/TeacherModel");
const StudentModel = require("../models/StudentModel");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For creating a new resource
    if (req.method === 'POST' && req.body.campusID) {
      return req.body.campusID;
    }
    // For updating/deleting an existing resource by _id in params
    if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
      const transaction = await TransactionsModel.findById(req.params.id).select('campusID').lean();
      return transaction?.campusID;
    }
    return null;
  }
};

//get banking details
route.get("/", protect, authorize("admin"), async (req, res) => {
  const { user, query } = req;
  try {
    let campusFilter = {};
    if (user.campusID) { // Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // Global Admin filtering
      campusFilter.campusID = query.campusID;
    }

    const docs = await TransactionsModel.find(campusFilter).sort({ createdAt: "desc" })
      .populate('studentID', 'name userID classID')
      .populate('teacherID', 'name userID')
      .populate('campusID', 'name');
    res.json(docs);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//get one bank details
route.get("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    // Future enhancement: Add campus check here for admins to ensure they can only access transactions from their campus.
    const doc = await TransactionsModel.findById(req.params.id).populate('studentID teacherID campusID');
    if (!doc) return res.status(404).json({ success: false, error: "Transaction not found" });
    res.json({ success: true, transaction: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//expenditure
route.get("/expenditure", protect, authorize("admin"), async (req, res) => {
  const { user, query } = req;
  try {
    let campusFilter = {};
    if (user.campusID) { // Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // Global Admin filtering
      campusFilter.campusID = query.campusID;
    }

    const docs = await TransactionsModel.find({ type: 'expense', ...campusFilter });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all transactions for all teachers
route.get("/teachers", protect, authorize("admin"), async (req, res) => {
  const { user, query } = req;
  try {
    let campusFilter = {};
    if (user.campusID) { // Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // Global Admin filtering
      campusFilter.campusID = query.campusID;
    }

    const docs = await TransactionsModel.find({
      teacherID: { $exists: true, $ne: null },
      ...campusFilter
    })
      .populate('teacherID', 'name userID')
      .populate('campusID', 'name')
      .sort({ createdAt: 'desc' });
    res.json({ success: true, transactions: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all transactions for a specific teacher by their userID
route.get("/teacher/:userID", protect, authorize("admin", "teacher", {
  ownershipCheck: (req) => {
    if (req.user.role === 'admin') return true;
    return req.user.userID === req.params.userID;
  }
}), async (req, res) => {
  try {
    const teacher = await TeacherModel.findOne({ userID: req.params.userID }).select('_id');
    if (!teacher) {
      return res.status(404).json({ success: false, error: "Teacher not found" });
    }
    const transactions = await TransactionsModel.find({ teacherID: teacher._id })
      .populate('teacherID', 'name userID')
      .populate('campusID', 'name')
      .sort({ createdAt: 'desc' });
    res.json({ success: true, transactions: transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all transactions for all students
route.get("/students", protect, authorize("admin"), async (req, res) => {
  const { user, query } = req;
  try {
    let campusFilter = {};
    if (user.campusID) { // Campus Admin
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // Global Admin filtering
      campusFilter.campusID = query.campusID;
    }

    const docs = await TransactionsModel.find({
      studentID: { $exists: true, $ne: null },
      ...campusFilter
    })
      .populate({
        path: 'studentID',
        select: 'name userID classID',
        populate: { path: 'classID', select: 'name' }
      })
      .populate('campusID', 'name')
      .sort({ createdAt: 'desc' });
    res.json({ success: true, transactions: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all transactions for a specific student by their userID
route.get("/student/:userID", protect, authorize("admin", "teacher", "student", {
  ownershipCheck: (req) => {
    if (req.user.role === 'admin' || req.user.role === 'teacher') return true;
    return req.user.userID === req.params.userID;
  }
}), async (req, res) => {
  try {
    const student = await StudentModel.findOne({ userID: req.params.userID }).select('_id');
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }
    const transactions = await TransactionsModel.find({ studentID: student._id })
      .populate({
        path: 'studentID',
        select: 'name userID classID',
        populate: { path: 'classID', select: 'name' }
      })
      .populate('campusID', 'name')
      .sort({ createdAt: 'desc' });
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

route.post("/create", protect, authorize("admin", campusCheckOptions), async (req, res) => {
  try {
    const data = await TransactionsModel.create(req.body);

    if (data) {
      // Only send SMS if it's a student transaction
      if (data.studentID) {
        const student = await StudentModel.findById(data.studentID);

        if (student && student.mobilenumber) {
          // send payment sms
          await sendPaymentSMS(
            student.mobilenumber,
            data.amount,
            data.transactionDate.toLocaleDateString(),
            data.paymentMethod,
            data._id
          );
        }
      }
      return res.status(200).json({ success: true, doc: data });
    } else {
      return res.status(400).json({ success: false, message: "something when wrong" });
    }
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

//update class register
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), async (req, res) => {
  try {
    const updatedTransaction = await TransactionsModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedTransaction) {
      return res.status(404).json({ success: false, error: "Transaction not found" });
    }

    res.json({ success: true, message: "Transaction updated successfully.", doc: updatedTransaction });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//delete
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), async (req, res) => {
  try {
    const deletedTransaction = await TransactionsModel.findByIdAndDelete(req.params.id);
    if (!deletedTransaction) {
      return res.status(404).json({ success: false, error: "Transaction not found" });
    }
    res.json({ success: true, message: "Transaction deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = route;
