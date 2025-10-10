const express = require("express");
const {
  getAllStoreItems,
  getStoreItemById,
  createStoreItem,
  updateStoreItem,
  updateItemInventory,
  deleteStoreItem,
} = require("../controllers/storeItemController");
const StoreItemsModel = require("../models/StoreItemsModel");
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
      const item = await StoreItemsModel.findById(req.params.id).select('campusID').lean();
      return item?.campusID;
    }
    return null;
  }
};

//get all events
route.get("/", protect, authorize("admin"), getAllStoreItems);

//get one by id
route.get("/:id", protect, authorize("admin"), getStoreItemById);

//create
route.post("/create", protect, authorize("admin", campusCheckOptions), createStoreItem);

//edit
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateStoreItem);

//edit
route.put(
  "/update/inventory/:id",
  protect,
  authorize("admin", campusCheckOptions),
  updateItemInventory
);

//delete
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteStoreItem);

module.exports = route;
