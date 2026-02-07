const express = require("express");
const {
  getSchoolProfile,
  signIn,
  createOrUpdateSchoolProfile,
  createAdmin,
  changeAdminPassword,
  getAllAdmins,
} = require("../controllers/schoolController");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

//find user by id
route.get("/", getSchoolProfile);

// Get all admins (super admin only - logic in controller)
route.get("/admins", protect, authorize("admin"), getAllAdmins);

//new login with password
// Signin user
route.post("/signin", signIn);

//upload profile
route.put("/update/:id", createOrUpdateSchoolProfile);

//create student
route.post("/create", protect, authorize("admin"), createAdmin);

//change password
route.post("/change/password/:id", changeAdminPassword);

module.exports = route;
