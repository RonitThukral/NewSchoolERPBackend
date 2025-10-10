const express = require("express");
const {
  getAllCampuses,
  getCampusById,
  createCampus,
  updateCampus,
  deleteCampus,
} = require("../controllers/campusController");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

//get all events
route.get("/", protect, authorize("admin", "teacher"), getAllCampuses);

//get one by id
route.get("/:id", protect, authorize("admin", "teacher"), getCampusById);

//create
route.post("/create", protect, authorize("admin"), createCampus);

//edit
route.put("/update/:id", protect, authorize("admin"), updateCampus);

//delete
route.delete("/delete/:id", protect, authorize("admin"), deleteCampus);

module.exports = route;
