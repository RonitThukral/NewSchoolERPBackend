const express = require("express");
const {
  getAllBankAccounts,
  getBankAccountById,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} = require("../controllers/bankingController");
const BankingModel = require("../models/BankingModel");
const { protect, authorize } = require("../middlewares/auth");

const route = express.Router();

const campusCheckOptions = {
  checkCampus: true,
  getCampusIdForResource: async (req) => {
    // For creating a new resource
    if (req.method === "POST" && req.body.campusID) {
      return req.body.campusID;
    }
    // For updating/deleting an existing resource by _id in params
    if ((req.method === "PUT" || req.method === "DELETE") && req.params.id) {
      const bankAccount = await BankingModel.findById(req.params.id)
        .select("campusID")
        .lean();
      return bankAccount?.campusID;
    }
    return null;
  },
};

//get all bank accounts
route.get("/", protect, authorize("admin"), getAllBankAccounts);

//get one bank account by id
route.get("/:id", protect, authorize("admin"), getBankAccountById);

//create bank account
route.post(
  "/create",
  protect,
  authorize("admin", campusCheckOptions),
  createBankAccount
);

//update bank account
route.put("/update/:id", protect, authorize("admin", campusCheckOptions), updateBankAccount);

//delete bank account
route.delete("/delete/:id", protect, authorize("admin", campusCheckOptions), deleteBankAccount);

module.exports = route;