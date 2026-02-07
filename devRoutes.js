// WARNING: FOR DEVELOPMENT USE ONLY. DO NOT EXPOSE IN PRODUCTION.

const express = require("express");
const {
  createGlobalAdminForDev,
  createCampusAdminForDev,
} = require("./devController");

const { identifyTenant } = require("./middlewares/tenantMiddleware");
const { attachTenantModels } = require("./middlewares/tenantModelHelper");

const route = express.Router();

// Apply middleware to all routes in this router
route.use(identifyTenant);
route.use(attachTenantModels);

route.post("/create-global-admin", createGlobalAdminForDev);
route.post("/create-campus-admin", createCampusAdminForDev);

module.exports = route;