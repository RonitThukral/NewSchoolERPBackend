const express = require('express');
const router = express.Router();
const TransportFee = require('../models/TransportModel');

// temp route to add multiple transport fees
router.post('/add-multiple-fees', async (req, res) => {
  try {
    const villageEntries = req.body; // Expecting an array of { village, amount }

    if (!Array.isArray(villageEntries) || villageEntries.length === 0) {
      return res.status(400).json({ error: 'Input must be a non-empty array of villages' });
    }

    const results = {
      added: [],
      skipped: [],
      errors: []
    };

    for (const entry of villageEntries) {
      const { village, amount } = entry;

      if (!village || !amount) {
        results.errors.push({ entry, error: 'Missing village or amount' });
        continue;
      }

      const existingFee = await TransportFee.findOne({ village });

      if (existingFee) {
        results.skipped.push({ village, reason: 'Village already exists' });
        continue;
      }

      try {
        const fee = new TransportFee({ village, amount });
        await fee.save();
        results.added.push(fee);
      } catch (error) {
        results.errors.push({ entry, error: error.message });
      }
    }

    res.status(207).json(results); // 207 Multi-Status
  } catch (err) {
    console.log("Error adding multiple transport fees:", err);
    res.status(500).json({ error: 'Server error' });
  }
});


// CREATE - Add new transport fee
router.post('/add-fees', async (req, res) => {
    try {
      const { village, amount } = req.body;
  
      // Check if village name already exists
      const existingFee = await TransportFee.findOne({ village });
      if (existingFee) {
        return res.status(400).json({ error: 'Village name already exists. Must be unique.' });
      }
  
      const fee = new TransportFee({
        village,
        amount
      });
  
      await fee.save();
      res.status(201).json({success: true, fee });
    } catch (err) {
      console.log("Error adding transport fee:", err);
      res.status(400).json({ error: err.message });
    }
  });
  

// READ ALL - Get all transport fees
router.get('/all-fees', async (req, res) => {
  try {
    const fees = await TransportFee.find();
    res.json(fees);
  } catch (err) {
    console.log("Error fetching all transport fees:", err);
    res.status(500).json({ error: err.message });
  }
});

// READ - Get transport fee by village or uniqueId
router.get('/get-fees/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const fee = await TransportFee.findOne({
      $or: [{ village: key }, { uniqueId: key }]
    });

    if (!fee) return res.status(404).json({ error: 'Transport fee not found' });
    res.json({success: true, fee });
  } catch (err) {
    console.log("Error fetching transport fee:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE - Update transport fee by village or uniqueId
router.put('/update-fees/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const { village, amount } = req.body;

    const fee = await TransportFee.findOneAndUpdate(
      { $or: [{ village: key }, { uniqueId: key }] },
      { village, amount },
      { new: true, runValidators: true }
    );

    if (!fee) return res.status(404).json({ error: 'Transport fee not found' });
    res.json({success: true, fee });
  } catch (err) {
    console.log("Error updating transport fee:", err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE - Remove transport fee by village or uniqueId
router.delete('/remove-fees/:key', async (req, res) => {
  try {
    const key = req.params.key;

    const fee = await TransportFee.findOneAndDelete({
      $or: [{ village: key }, { uniqueId: key }]
    });

    if (!fee) return res.status(404).json({ error: 'Transport fee not found' });
    res.json({success:true, deleted: fee });
  } catch (err) {
    console.log("Error deleting transport fee:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
