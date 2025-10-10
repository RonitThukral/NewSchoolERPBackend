const express = require("express");
const {
  getAllActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
} = require("../controllers/activityLogController");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

//get all events
route.get("/", protect, authorize("admin"), getAllActivities);

//get one by id
route.get("/:id", protect, authorize("admin"), getActivityById);

//create
route.post("/create", protect, createActivity); // Any logged-in user can create an activity log entry by performing an action

//edit
route.put("/update/:id", protect, authorize("admin"), updateActivity);

//delete
route.delete("/delete/:id", protect, authorize("admin"), deleteActivity);

module.exports = route;
