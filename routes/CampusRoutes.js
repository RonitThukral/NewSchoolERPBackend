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

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For creating, the campusID is the resource itself, so we don't need to check.
    // For updating/deleting an existing resource by _id in params
    if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
      // A campus admin should only be able to edit their OWN campus.
      // The resource ID is the campus ID.
      return req.params.id;
    }
    // For GET requests, the controller handles filtering, so no check needed here.
    return null;
  }
};

//get all campuses (controller filters for campus admin)
route.get("/", protect, authorize("admin", "teacher"), getAllCampuses);

//get one by id
route.get("/:id", protect, authorize("admin", "teacher"), getCampusById);

//create
route.post("/create", protect, authorize("admin"), createCampus); // No campus check needed for creation

//edit
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateCampus);

//delete
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteCampus);

module.exports = route;
