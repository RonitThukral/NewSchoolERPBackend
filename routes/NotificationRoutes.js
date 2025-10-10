const express = require("express");
const {
  getAllNotifications,
  getPastNotifications,
  getUpcomingNotifications,
  getNotificationsByTitle,
  createNotification,
  updateNotification,
  deleteNotification,
  deleteAllNotifications,
} = require("../controllers/notificationController");
const NoticeModel = require("../models/NoticeModel");
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
      const notice = await NoticeModel.findById(req.params.id).select('campusID').lean();
      return notice?.campusID;
    }
    return null;
  }
};

//get all
route.get("/", protect, authorize("admin", "teacher", "student"), getAllNotifications);

//get past events
route.get("/past", protect, authorize("admin", "teacher", "student"), getAllNotifications);

//get this month events
route.get("/upcoming", protect, authorize("admin", "teacher", "student"), getUpcomingNotifications);

//get one by id
route.get("/title/:id", protect, authorize("admin", "teacher", "student"), getNotificationsByTitle);

//add notice
route.post("/create", protect, authorize("admin", campusCheckOptions), createNotification);

//edit
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateNotification);

//delete
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteNotification);

//delete all
route.delete("/delete", protect, authorize("admin", campusCheckOptions), deleteAllNotifications);

module.exports = route;
