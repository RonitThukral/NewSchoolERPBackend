const SmsModel = require("../models/SmsModel");

const addSms = async (data) => {
  try {
    const sms = await SmsModel.create(data);
    return sms;
  } catch (err) {
    throw new Error(err.message);
  }
};

const getSms = async () => {
  try {
    const sms = await SmsModel.find();
    return sms;
  } catch (err) {
    throw new Error(err.message);
  }
};

const deleteSms = async (id) => {
  try {
    const sms = await SmsModel.findByIdAndDelete(id);
    return sms;
  } catch (err) {
    throw new Error(err.message);
  }
};

const getSmsById = async (id) => {
  try {
    const sms = await SmsModel.findById(id);
    return sms;
  } catch (err) {
    throw new Error(err.message);
  }
};

const getSmsByDate = async (date) => {
  try {
    const sms = await SmsModel.find();
    return sms.filter((s) => s.date.toISOString().split("T")[0] === date);
  } catch (err) {
    throw new Error(err.message);
  }
};

const getSmsByDateRange = async (startDate, endDate) => {
  try {
    const sms = await SmsModel.find();
    return sms.filter((s) => {
      const date = s.date.toISOString().split("T")[0];
      return date >= startDate && date <= endDate;
    });
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = {
  addSms,
  getSms,
  deleteSms,
  getSmsById,
  getSmsByDate,
  getSmsByDateRange,
};
