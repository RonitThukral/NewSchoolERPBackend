const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  handleCallback,
  checkPaymentStatus,
  handleRedirect,
  getAllTransactions
} = require('../controllers/paymentController');

// 1. POST - Initiate Payment (Test with Postman)
router.post('/initiate', initiatePayment);

// 2. ALL - Handle Callback (PhonePe calls this automatically)
router.all('/callback', handleCallback);

// 3. GET - Check Payment Status (Test with Postman)
router.get('/status/:merchantTransactionId', checkPaymentStatus);

// 4. ALL - Handle Redirect (Browser redirect after payment)
router.all('/redirect', handleRedirect);
router.all('/redirect/', handleRedirect); // Support trailing slash

// 5. GET - Get All Transactions (For debugging)
router.get('/transactions', getAllTransactions);

module.exports = router;