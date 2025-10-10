const express = require("express");
const route = express.Router();
const {
  addSms,
  getSms,
  deleteSms,
  getSmsById,
  getSmsByDateRange,
  getSmsByDate,
} = require("../services/SmsCounterService");

route.post("/", async (req, res) => {
  try {
    const data = await addSms(req.body);
    return res.json({ data });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

route.get("/", async (req, res) => {
  try {
    const data = await getSms();
    return res.json({ data });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

route.get("/:id", async (req, res) => {
  try {
    const data = await getSmsById(req.params.id);
    return res.json({ data });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

route.get("/date/:date", async (req, res) => {
  try {
    const data = await getSmsByDate(req.params.date);
    return res.json({ data });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

route.get("/daterange/:start/:end", async (req, res) => {
  try {
    const data = await getSmsByDateRange(req.params.start, req.params.end);
    return res.json({ data });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

route.delete("/", async (req, res) => {
  try {
    const data = await deleteSms();
    return res.json({ data });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

module.exports = route;
