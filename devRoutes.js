// WARNING: FOR DEVELOPMENT USE ONLY. DO NOT EXPOSE IN PRODUCTION.

const express = require("express");
const {
  createGlobalAdminForDev,
  createCampusAdminForDev,
} = require("../controllers/devController");

const route = express.Router();

route.post("/create-global-admin", createGlobalAdminForDev);
route.post("/create-campus-admin", createCampusAdminForDev);

module.exports = route;