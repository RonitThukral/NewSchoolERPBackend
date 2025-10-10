const express = require("express");
const route = express.Router();
const cloudinary = require("../middlewares/cloudinary");
const streamifier = require("streamifier");
const multer = require("multer");
const storage = multer.memoryStorage();
const {
  getAllLeaveApplications,
  getLeaveApplicationById,
  getLeaveApplicationsByUserId,
  createLeaveApplication,
  updateLeaveApplicationStatus,
  deleteLeaveApplication,
} = require("../controllers/leaveApplicationController");
const LeaveApplicationModel = require("../models/LeaveApplicationModel");
const { protect, authorize } = require("../middlewares/auth");

const upload = multer({ storage: storage });
route.post(
  "/",
  protect,
  upload.fields([{ name: "pdf" }, { name: "image" }]),
  createLeaveApplication
);

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For updating/deleting an existing resource by _id in params
    if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
      const application = await LeaveApplicationModel.findById(req.params.id).select('campusID').lean();
      return application?.campusID;
    }
    return null;
  }
};

route.get("/", protect, authorize("admin"), getAllLeaveApplications);
route.get("/:id", protect, getLeaveApplicationById);

// GET by userID
route.get("/user/:id", protect, getLeaveApplicationsByUserId);

// UPDATE status only (Admin action)
route.put(
  "/:id/status",
  protect,
  authorize("admin", campusCheckOptions),
  updateLeaveApplicationStatus
);

// DELETE by ID (Admin action)
route.delete("/:id", protect, authorize("admin", campusCheckOptions), deleteLeaveApplication);

module.exports = route;