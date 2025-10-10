const express = require("express");
const {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale,
} = require("../controllers/storeSalesController");
const StoreSalesModel = require("../models/StoreSalesModel");
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
      const sale = await StoreSalesModel.findById(req.params.id).select('campusID').lean();
      return sale?.campusID;
    }
    return null;
  }
};

//get all events
route.get("/", protect, authorize("admin"), getAllSales);

//get one by id
route.get("/:id", protect, authorize("admin"), getSaleById);

//create
route.post("/create", protect, authorize("admin", campusCheckOptions), createSale);

//edit
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateSale);

//delete
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteSale);

module.exports = route;
