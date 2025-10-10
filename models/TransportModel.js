const mongoose = require('mongoose');

// Function to generate a custom unique ID
const generateUniqueId = () => {
  const timestamp = Date.now().toString(36);  
  const randomPart = Math.random().toString(36).slice(2, 11);  
  return `${timestamp}-${randomPart}`;  
};


const transportFeeSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    default: generateUniqueId,
    unique: true
  },
  village: {
    type: String,
    required: true,
    unique: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  campusID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "campus",
    required: true,
  }
});

module.exports = mongoose.model('TransportFee', transportFeeSchema);
