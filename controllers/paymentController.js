// const crypto = require("crypto");
// const axios = require("axios");
// const { v4: uuidv4 } = require("uuid");
// const TransactionsModel = require("../models/TransactionsModel");
// const StudentModel = require("../models/StudentModel");

// // PhonePe Business API Configuration (CORRECTED)
// const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
// const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
// const PHONEPE_BASE_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox';
// const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

// // Extract Merchant ID from Client ID (for PhonePe Business API)
// const MERCHANT_ID = PHONEPE_CLIENT_ID ? PHONEPE_CLIENT_ID.split('_')[0] : '';

// console.log('PhonePe Config:', {
//   clientId: PHONEPE_CLIENT_ID,
//   merchantId: MERCHANT_ID,
//   baseUrl: PHONEPE_BASE_URL,
//   serverUrl: BASE_URL
// });

// // Helper function to generate checksum for PhonePe Business API
// const generateBusinessChecksum = (payload, endpoint) => {
//   // For PhonePe Business API, checksum = SHA256(base64_payload + endpoint + client_secret)
//   const string = payload + endpoint + PHONEPE_CLIENT_SECRET;
//   const sha256 = crypto.createHash('sha256').update(string).digest('hex');
//   return sha256 + '###1'; // Salt index is always 1 for business API
// };

// // Helper function to verify checksum
// const verifyBusinessChecksum = (receivedChecksum, payload) => {
//   try {
//     const [hash] = receivedChecksum.split('###');
//     const string = payload + PHONEPE_CLIENT_SECRET;
//     const calculatedHash = crypto.createHash('sha256').update(string).digest('hex');
//     return hash === calculatedHash;
//   } catch (error) {
//     console.error('Checksum verification error:', error);
//     return false;
//   }
// };

// // Generate access token for PhonePe Business API
// const generateAccessToken = async () => {
//   try {
//     const tokenUrl = `${PHONEPE_BASE_URL}/v1/oauth/token`;

//     const tokenPayload = {
//       grant_type: 'client_credentials',
//       client_id: PHONEPE_CLIENT_ID,
//       client_secret: PHONEPE_CLIENT_SECRET
//     };

//     const response = await axios.post(tokenUrl, tokenPayload, {
//       headers: {
//         'Content-Type': 'application/json'
//       }
//     });

//     if (response.data.access_token) {
//       console.log('✅ Access token generated successfully');
//       return response.data.access_token;
//     } else {
//       throw new Error('No access token in response');
//     }
//   } catch (error) {
//     console.error('❌ Token generation failed:', error.response?.data || error.message);
//     throw error;
//   }
// };

// // 1. INITIATE PAYMENT
// exports.initiatePayment = async (req, res) => {
//   try {
//     console.log('=== PHONEPE BUSINESS API PAYMENT INITIATION ===');
//     console.log('Request Body:', JSON.stringify(req.body, null, 2));

//     const { studentId, amount, academicYear, term } = req.body;

//     // Input validation
//     if (!studentId || !amount || !academicYear || !term) {
//       return res.status(400).json({ 
//         success: false, 
//         error: "Missing required fields",
//         required: ["studentId", "amount", "academicYear", "term"],
//         received: req.body
//       });
//     }

//     if (amount <= 0 || amount > 100000) {
//       return res.status(400).json({ 
//         success: false, 
//         error: "Amount must be between ₹1 and ₹1,00,000" 
//       });
//     }

//     // Find student in database
//     const student = await StudentModel.findOne({ userID: studentId }) || 
//                    await StudentModel.findOne({ _id: studentId }) ||
//                    await StudentModel.findById(studentId);

//     if (!student) {
//       return res.status(404).json({ 
//         success: false, 
//         error: "Student not found with ID: " + studentId,
//         hint: "Make sure the student exists in your database"
//       });
//     }

//     console.log('Found Student:', student.name || student._id);

//     // Generate unique transaction ID
//     const merchantTransactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
//     const paymentAmount = Math.round(amount * 100); // Convert to paise

//     // Get mobile number
//     const mobileNumber = student.guardian?.[0]?.mobile || 
//                         student.mobilenumber || 
//                         student.mobile || 
//                         student.phone ||
//                         '9999999999'; // fallback for testing

//     console.log('Payment Details:', {
//       merchantTransactionId,
//       paymentAmount,
//       mobileNumber
//     });

//     // Create payment payload for PhonePe Business API
//     const paymentPayload = {
//       merchantId: MERCHANT_ID,
//       merchantTransactionId: merchantTransactionId,
//       merchantUserId: `USER${student.userID || student._id}`,
//       amount: paymentAmount,
//       redirectUrl: `${BASE_URL}/api/payment/redirect?txn=${merchantTransactionId}`,
//       redirectMode: "GET",
//       callbackUrl: `${BASE_URL}/api/payment/callback`,
//       mobileNumber: mobileNumber,
//       paymentInstrument: {
//         type: "PAY_PAGE"
//       }
//     };

//     console.log('=== PAYMENT PAYLOAD ===');
//     console.log(JSON.stringify(paymentPayload, null, 2));

//     // Encode payload to base64
//     const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

//     // Generate checksum
//     const endpoint = '/pg/v1/pay';
//     const checksum = generateBusinessChecksum(base64Payload, endpoint);

//     console.log('=== API REQUEST DETAILS ===');
//     console.log('URL:', `${PHONEPE_BASE_URL}${endpoint}`);
//     console.log('Checksum:', checksum);
//     console.log('Base64 Payload Length:', base64Payload.length);

//     // Prepare headers
//     const headers = {
//       'Content-Type': 'application/json',
//       'X-VERIFY': checksum,
//       'accept': 'application/json'
//     };

//     // Make API call to PhonePe
//     const response = await axios.post(
//       `${PHONEPE_BASE_URL}${endpoint}`,
//       { request: base64Payload },
//       { 
//         headers,
//         timeout: 30000
//       }
//     );

//     console.log('=== PHONEPE API RESPONSE ===');
//     console.log(JSON.stringify(response.data, null, 2));

//     // Check if payment initiation was successful
//     if (response.data.success && response.data.data?.instrumentResponse?.redirectInfo?.url) {

//       // Save transaction to database
//       const transaction = await TransactionsModel.create({
//         merchantTransactionId: merchantTransactionId,
//         studentID: student._id,
//         campusID: student.campusID,
//         amount: amount,
//         netAmount: amount,
//         category: 'fees',
//         type: 'income',
//         status: 'PENDING',
//         academicYear: academicYear,
//         term: term,
//         paymentMethod: 'phonepe_business',
//         description: `Fee payment for ${student.name || student.userID} - ${academicYear} ${term}`,
//         createdAt: new Date(),
//         phonepeData: {
//           merchantTransactionId: merchantTransactionId,
//           amount: paymentAmount,
//           mobileNumber: mobileNumber,
//           clientId: PHONEPE_CLIENT_ID
//         }
//       });

//       console.log('✅ Transaction saved to database:', transaction._id);

//       // Return success response
//       return res.json({
//         success: true,
//         message: "Payment initiated successfully with PhonePe Business API",
//         data: {
//           transactionId: transaction._id,
//           merchantTransactionId: merchantTransactionId,
//           paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
//           amount: amount,
//           amountInPaise: paymentAmount,
//           studentName: student.name || student.userID,
//           studentId: student.userID || student._id,
//           mobileNumber: mobileNumber,
//           status: 'PENDING',
//           clientId: PHONEPE_CLIENT_ID,
//           merchantId: MERCHANT_ID
//         },
//         instructions: {
//           step1: "Copy the paymentUrl and open it in browser to complete payment",
//           step2: "Use test card: 4111 1111 1111 1111, CVV: 123, OTP: 123456",
//           step3: "After payment, check status using GET /api/payments/status/{merchantTransactionId}"
//         }
//       });

//     } else {
//       console.error('❌ PhonePe API failed:', response.data);
//       return res.status(400).json({
//         success: false,
//         error: "Payment initiation failed",
//         phonepeResponse: response.data,
//         message: response.data.message || "Unknown error from PhonePe Business API"
//       });
//     }

//   } catch (error) {
//     console.error("❌ PAYMENT INITIATION ERROR:", error);

//     if (error.response) {
//       console.error("API Error Response:", error.response.data);
//       return res.status(500).json({
//         success: false,
//         error: "PhonePe Business API Error",
//         details: error.response.data,
//         status: error.response.status
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       error: "Internal server error",
//       message: error.message,
//       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// };

// // 2. HANDLE CALLBACK
// exports.handleCallback = async (req, res) => {
//   try {
//     console.log('=== PHONEPE BUSINESS CALLBACK RECEIVED ===');
//     console.log('Headers:', JSON.stringify(req.headers, null, 2));
//     console.log('Body:', JSON.stringify(req.body, null, 2));

//     const { response: encodedPayload } = req.body;
//     const checksum = req.headers['x-verify'];

//     if (!encodedPayload || !checksum) {
//       console.error('❌ Missing payload or checksum');
//       return res.status(400).send("Invalid callback data");
//     }

//     // Verify checksum
//     const isValidChecksum = verifyBusinessChecksum(checksum, encodedPayload);
//     if (!isValidChecksum) {
//       console.error('❌ Checksum verification failed');
//       return res.status(400).send("Invalid checksum");
//     }

//     // Decode payload
//     const decodedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString());
//     console.log('=== DECODED CALLBACK PAYLOAD ===');
//     console.log(JSON.stringify(decodedPayload, null, 2));

//     const { 
//       merchantTransactionId, 
//       transactionId,
//       success, 
//       code, 
//       message,
//       data 
//     } = decodedPayload;

//     // Find transaction in database
//     const transaction = await TransactionsModel.findOne({ merchantTransactionId });
//     if (!transaction) {
//       console.error(`❌ Transaction not found: ${merchantTransactionId}`);
//       return res.status(404).send("Transaction not found");
//     }

//     console.log('✅ Found transaction in database:', transaction._id);

//     // Update transaction status
//     if (success === true && code === "PAYMENT_SUCCESS") {
//       transaction.status = "SUCCESS";
//       transaction.description = "Payment completed successfully via PhonePe Business API";
//       transaction.phonepeTransactionId = transactionId || data?.transactionId;
//       transaction.completedAt = new Date();
//       transaction.callbackData = decodedPayload;

//       await transaction.save();
//       console.log('✅ Payment marked as SUCCESS');

//     } else {
//       transaction.status = "FAILED";
//       transaction.description = message || `Payment failed: ${code}`;
//       transaction.completedAt = new Date();
//       transaction.callbackData = decodedPayload;

//       await transaction.save();
//       console.log('❌ Payment marked as FAILED:', code);
//     }

//     // Send OK response to PhonePe
//     res.status(200).send("OK");

//   } catch (error) {
//     console.error("❌ CALLBACK PROCESSING ERROR:", error);
//     res.status(500).send("Callback processing error");
//   }
// };

// // 3. CHECK PAYMENT STATUS
// exports.checkPaymentStatus = async (req, res) => {
//   try {
//     const { merchantTransactionId } = req.params;

//     console.log('=== CHECKING PAYMENT STATUS ===');
//     console.log('Transaction ID:', merchantTransactionId);

//     if (!merchantTransactionId) {
//       return res.status(400).json({
//         success: false,
//         error: "merchantTransactionId is required in URL params"
//       });
//     }

//     // Get local transaction from database
//     const localTransaction = await TransactionsModel.findOne({ merchantTransactionId })
//       .populate('studentID', 'name userID');

//     if (!localTransaction) {
//       return res.status(404).json({
//         success: false,
//         error: "Transaction not found in database",
//         merchantTransactionId: merchantTransactionId
//       });
//     }

//     // Check status with PhonePe Business API
//     const endpoint = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
//     const checksum = generateBusinessChecksum('', endpoint);

//     const headers = {
//       'Content-Type': 'application/json',
//       'X-VERIFY': checksum,
//       'X-MERCHANT-ID': MERCHANT_ID,
//       'accept': 'application/json'
//     };

//     console.log('Checking status with PhonePe Business API...');
//     console.log('Status URL:', `${PHONEPE_BASE_URL}${endpoint}`);

//     const response = await axios.get(`${PHONEPE_BASE_URL}${endpoint}`, { headers });

//     console.log('PhonePe Status Response:', JSON.stringify(response.data, null, 2));

//     return res.json({
//       success: true,
//       data: {
//         localTransaction: {
//           id: localTransaction._id,
//           merchantTransactionId: localTransaction.merchantTransactionId,
//           status: localTransaction.status,
//           amount: localTransaction.amount,
//           student: localTransaction.studentID,
//           createdAt: localTransaction.createdAt,
//           completedAt: localTransaction.completedAt,
//           description: localTransaction.description
//         },
//         phonepeStatus: response.data,
//         apiUsed: 'PhonePe Business API',
//         clientId: PHONEPE_CLIENT_ID,
//         merchantId: MERCHANT_ID
//       }
//     });

//   } catch (error) {
//     console.error("❌ STATUS CHECK ERROR:", error);

//     if (error.response) {
//       return res.status(500).json({
//         success: false,
//         error: "PhonePe Business API error",
//         details: error.response.data
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       error: "Status check failed",
//       message: error.message
//     });
//   }
// };

// // 4. REDIRECT HANDLER
// exports.handleRedirect = async (req, res) => {
//   try {
//     const { txn } = req.query;

//     console.log('=== REDIRECT RECEIVED ===');
//     console.log('Transaction ID:', txn);

//     if (!txn) {
//       return res.send(`
//         <html><body style="font-family: Arial; text-align: center; padding: 50px;">
//           <h2>❌ Error</h2>
//           <p>Missing transaction ID</p>
//         </body></html>
//       `);
//     }

//     const transaction = await TransactionsModel.findOne({ 
//       merchantTransactionId: txn 
//     }).populate('studentID');

//     if (!transaction) {
//       return res.send(`
//         <html><body style="font-family: Arial; text-align: center; padding: 50px;">
//           <h2>❌ Transaction Not Found</h2>
//           <p>Transaction ID: ${txn}</p>
//         </body></html>
//       `);
//     }

//     const statusColor = transaction.status === 'SUCCESS' ? '#28a745' : 
//                        transaction.status === 'FAILED' ? '#dc3545' : '#ffc107';
//     const statusEmoji = transaction.status === 'SUCCESS' ? '✅' : 
//                        transaction.status === 'FAILED' ? '❌' : '⏳';

//     const html = `
//       <html>
//         <head><title>PhonePe Business - Payment ${transaction.status}</title></head>
//         <body style="font-family: Arial; text-align: center; padding: 50px;">
//           <div style="max-width: 500px; margin: 0 auto; border: 2px solid ${statusColor}; padding: 30px; border-radius: 10px;">
//             <h1 style="color: ${statusColor};">${statusEmoji} Payment ${transaction.status}</h1>
//             <p><strong>Transaction ID:</strong> ${transaction._id}</p>
//             <p><strong>PhonePe TXN:</strong> ${transaction.merchantTransactionId}</p>
//             <p><strong>Amount:</strong> ₹${transaction.amount}</p>
//             <p><strong>Student:</strong> ${transaction.studentID?.name || 'N/A'}</p>
//             <p><strong>Academic Year:</strong> ${transaction.academicYear}</p>
//             <p><strong>Term:</strong> ${transaction.term}</p>
//             <p><strong>API Used:</strong> PhonePe Business API</p>
//             <p><strong>Date:</strong> ${transaction.createdAt.toLocaleString()}</p>
//             <hr>
//             <p style="font-size: 12px; color: #666;">Powered by PhonePe Business API</p>
//           </div>
//         </body>
//       </html>
//     `;

//     res.send(html);
//   } catch (error) {
//     console.error("❌ REDIRECT ERROR:", error);
//     res.status(500).send(`
//       <html><body style="font-family: Arial; text-align: center; padding: 50px;">
//         <h2>❌ Error</h2>
//         <p>Something went wrong processing the redirect</p>
//       </body></html>
//     `);
//   }
// };

// // 5. GET ALL TRANSACTIONS
// exports.getAllTransactions = async (req, res) => {
//   try {
//     const transactions = await TransactionsModel.find()
//       .populate('studentID', 'name userID')
//       .sort({ createdAt: -1 })
//       .limit(20);

//     res.json({
//       success: true,
//       count: transactions.length,
//       apiUsed: 'PhonePe Business API',
//       clientId: PHONEPE_CLIENT_ID,
//       data: transactions
//     });
//   } catch (error) {
//     console.error('Error fetching transactions:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };







































const crypto = require("crypto");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const TransactionsModel = require("../models/TransactionsModel");
const StudentModel = require("../models/StudentModel");

// PhonePe OFFICIAL TEST CREDENTIALS (These work immediately)
const PHONEPE_MERCHANT_ID = 'PGTESTPAYUAT86';
const PHONEPE_SALT_KEY = '96434309-7796-489d-8924-ab56988a6076';
const PHONEPE_SALT_INDEX = 1;
const PHONEPE_BASE_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

console.log('PhonePe Official Test Config:', {
  merchantId: PHONEPE_MERCHANT_ID,
  saltKey: PHONEPE_SALT_KEY ? '***HIDDEN***' : 'NOT SET',
  saltIndex: PHONEPE_SALT_INDEX,
  baseUrl: PHONEPE_BASE_URL,
  serverUrl: BASE_URL
});

// Generate checksum using official method
const generateChecksum = (payload, endpoint) => {
  const string = payload + endpoint + PHONEPE_SALT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return sha256 + '###' + PHONEPE_SALT_INDEX;
};

// Verify checksum
const verifyChecksum = (receivedChecksum, payload) => {
  try {
    const [hash, saltIndex] = receivedChecksum.split('###');
    const string = payload + PHONEPE_SALT_KEY;
    const calculatedHash = crypto.createHash('sha256').update(string).digest('hex');
    return hash === calculatedHash && saltIndex === PHONEPE_SALT_INDEX.toString();
  } catch (error) {
    console.error('Checksum verification error:', error);
    return false;
  }
};

// 1. INITIATE PAYMENT (Working Version)
exports.initiatePayment = async (req, res) => {
  try {
    console.log('=== PHONEPE OFFICIAL TEST API PAYMENT INITIATION ===');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));

    const { studentId, amount, academicYear, term, paymentType, description } = req.body;

    // Input validation (term is optional)
    if (!studentId || !amount || !academicYear) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        required: ["studentId", "amount", "academicYear"],
        received: req.body
      });
    }

    if (amount <= 0 || amount > 100000) {
      return res.status(400).json({
        success: false,
        error: "Amount must be between ₹1 and ₹1,00,000"
      });
    }

    // Get multi-tenant aware models
    const Students = await req.getModel('students');
    const Transactions = await req.getModel('transactions');

    // Find student in database
    const student = await Students.findOne({ userID: studentId }) ||
      await Students.findOne({ _id: studentId }) ||
      await Students.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Student not found with ID: " + studentId,
        hint: "Make sure the student exists in your database"
      });
    }

    console.log('Found Student:', student.name || student._id);

    // Generate unique transaction ID with tenant prefix for robust identification in callbacks/redirects
    const tenantPrefix = req.tenantId && req.tenantId !== 'default' ? `T${req.tenantId}_` : '';
    const merchantTransactionId = `${tenantPrefix}TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const paymentAmount = Math.round(amount * 100); // Convert to paise

    // Get mobile number
    const mobileNumber = student.guardian?.[0]?.mobile ||
      student.mobilenumber ||
      student.mobile ||
      student.phone ||
      '9999999999';

    console.log('Payment Details:', {
      merchantTransactionId,
      paymentAmount,
      mobileNumber
    });

    // Create payment payload (Official Format)
    const isQR = paymentType === 'qr';
    const paymentPayload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: `USER${student.userID || student._id}`,
      amount: paymentAmount,
      redirectUrl: `${BASE_URL}/api/payment/redirect?txn=${merchantTransactionId}&tenant=${req.tenantId || 'default'}`,
      redirectMode: "GET",
      callbackUrl: `${BASE_URL}/api/payment/callback?tenant=${req.tenantId || 'default'}`,
      mobileNumber: mobileNumber,
      paymentInstrument: isQR ? {
        type: "UPI_QR"
      } : {
        type: "PAY_PAGE"
      }
    };

    console.log('=== PAYMENT PAYLOAD (Official Test) ===');
    console.log(JSON.stringify(paymentPayload, null, 2));

    // Encode payload to base64
    const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

    // Generate checksum
    const endpoint = '/pg/v1/pay';
    const checksum = generateChecksum(base64Payload, endpoint);

    console.log('=== API REQUEST DETAILS ===');
    console.log('URL:', `${PHONEPE_BASE_URL}${endpoint}`);
    console.log('Checksum:', checksum);
    console.log('Base64 Payload Length:', base64Payload.length);

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'accept': 'application/json'
    };

    // Make API call to PhonePe
    const response = await axios.post(
      `${PHONEPE_BASE_URL}${endpoint}`,
      { request: base64Payload },
      {
        headers,
        timeout: 30000
      }
    );

    console.log('=== PHONEPE API RESPONSE ===');
    console.log(JSON.stringify(response.data, null, 2));

    const instrumentResponse = response.data.data?.instrumentResponse;
    const paymentUrl = instrumentResponse?.redirectInfo?.url;
    const qrData = instrumentResponse?.qrData;

    // Check if payment initiation was successful
    if (response.data.success && (paymentUrl || qrData)) {

      let transactionId = merchantTransactionId; // Default fallback

      try {
        // Fallback for campusID if missing (ensure transaction is saveable)
        const campusID = student.campusID || (await (await req.getModel('campus')).findOne().select('_id'));

        if (!campusID) {
          console.warn('Warning: No campusID found for student or default campus. Payment initiation might fail if campusID is required.');
        }

        // Save transaction to database
        const transaction = await Transactions.create({
          merchantTransactionId: merchantTransactionId,
          studentID: student._id,
          campusID: campusID, // Use fallback
          amount: amount,
          netAmount: amount,
          category: 'fees',
          type: 'income',
          status: 'PENDING',
          academicYear: academicYear,
          term: term,
          paymentMethod: 'online_gateway',
          description: description || `Fee payment for ${student.name || student.userID} - ${academicYear} ${term}`,
          createdAt: new Date(),
          phonepeData: {
            merchantTransactionId: merchantTransactionId,
            amount: paymentAmount,
            mobileNumber: mobileNumber,
            merchantId: PHONEPE_MERCHANT_ID
          }
        });

        transactionId = transaction._id;
        console.log('✅ Transaction saved to database:', transaction._id);

      } catch (dbError) {
        console.error('❌ Database save failed during payment initiation:', dbError);
        // We continue because the user should still get the payment URL even if DB save failed locally
      }

      // Return success response
      return res.json({
        success: true,
        message: `Payment initiated successfully with PhonePe Official Test Credentials (${isQR ? 'QR CODE' : 'PAY PAGE'})`,
        data: {
          transactionId: transactionId,
          merchantTransactionId: merchantTransactionId,
          paymentUrl: response.data.data?.instrumentResponse?.redirectInfo?.url,
          qrData: response.data.data?.instrumentResponse?.qrData,
          amount: amount,
          amountInPaise: paymentAmount,
          studentName: student.name || student.userID,
          studentId: student.userID || student._id,
          mobileNumber: mobileNumber,
          status: 'PENDING',
          merchantId: PHONEPE_MERCHANT_ID,
          credentialsUsed: 'Official PhonePe Test'
        },
        instructions: {
          step1: "Copy the paymentUrl and open it in browser to complete payment",
          step2: "Use test card: 4111 1111 1111 1111, CVV: 123, OTP: 123456",
          step3: "After payment, check status using GET /api/payment/status/{merchantTransactionId}"
        }
      });

    } else {
      console.error('PhonePe API failed:', response.data);
      return res.status(400).json({
        success: false,
        error: "Payment initiation failed",
        phonepeResponse: response.data,
        message: response.data.message || "Unknown error from PhonePe Official Test API"
      });
    }

  } catch (error) {
    console.error("PAYMENT INITIATION ERROR:", error);

    if (error.response) {
      console.error("API Error Response:", error.response.data);
      return res.status(500).json({
        success: false,
        error: "PhonePe Official Test API Error",
        details: error.response.data,
        status: error.response.status
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
      phonepeError: error.response?.data,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 2. HANDLE CALLBACK
exports.handleCallback = async (req, res) => {
  try {
    console.log('=== PHONEPE OFFICIAL TEST CALLBACK RECEIVED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { response: encodedPayload } = req.body;
    const checksum = req.headers['x-verify'];

    if (!encodedPayload || !checksum) {
      console.error('Missing payload or checksum');
      return res.status(400).send("Invalid callback data");
    }

    // Verify checksum
    const isValidChecksum = verifyChecksum(checksum, encodedPayload);
    if (!isValidChecksum) {
      console.error('Checksum verification failed');
      return res.status(400).send("Invalid checksum");
    }

    // Decode payload
    const decodedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString());
    console.log('=== DECODED CALLBACK PAYLOAD ===');
    console.log(JSON.stringify(decodedPayload, null, 2));

    const {
      merchantTransactionId,
      transactionId,
      success,
      code,
      message,
      data
    } = decodedPayload;

    // Find transaction in database (Tenant Aware)
    const Transactions = await req.getModel('transactions');
    const transaction = await Transactions.findOne({ merchantTransactionId });
    if (!transaction) {
      console.error(`Transaction not found: ${merchantTransactionId}`);
      return res.status(404).send("Transaction not found");
    }

    console.log('Found transaction in database:', transaction._id);

    // Update transaction status
    if (success === true && code === "PAYMENT_SUCCESS") {
      transaction.status = "SUCCESS";
      transaction.description = "Payment completed successfully via PhonePe Official Test API";
      transaction.phonepeTransactionId = transactionId || data?.transactionId;
      transaction.completedAt = new Date();
      transaction.callbackData = decodedPayload;

      await transaction.save();
      console.log('Payment marked as SUCCESS');

    } else {
      transaction.status = "FAILED";
      transaction.description = message || `Payment failed: ${code}`;
      transaction.completedAt = new Date();
      transaction.callbackData = decodedPayload;

      await transaction.save();
      console.log('Payment marked as FAILED:', code);
    }

    // Send OK response to PhonePe
    res.status(200).send("OK");

  } catch (error) {
    console.error("CALLBACK PROCESSING ERROR:", error);
    res.status(500).send("Callback processing error");
  }
};

// 3. CHECK PAYMENT STATUS
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;

    console.log('=== CHECKING PAYMENT STATUS ===');
    console.log('Transaction ID:', merchantTransactionId);

    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        error: "merchantTransactionId is required in URL params"
      });
    }

    // Get local transaction from database (Tenant Aware)
    const Transactions = await req.getModel('transactions');
    const localTransaction = await Transactions.findOne({ merchantTransactionId })
      .populate('studentID', 'name userID');

    if (!localTransaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found in database",
        merchantTransactionId: merchantTransactionId
      });
    }

    // Check status with PhonePe Official Test API
    const endpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
    const checksum = generateChecksum('', endpoint);

    const headers = {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
      'accept': 'application/json'
    };

    console.log('Checking status with PhonePe Official Test API...');
    console.log('Status URL:', `${PHONEPE_BASE_URL}${endpoint}`);

    const response = await axios.get(`${PHONEPE_BASE_URL}${endpoint}`, { headers });

    console.log('PhonePe Status Response:', JSON.stringify(response.data, null, 2));

    // Update DB status if PhonePe says it's successful
    if (response.data.success && response.data.code === "PAYMENT_SUCCESS") {
      localTransaction.status = "SUCCESS";
      localTransaction.phonepeTransactionId = response.data.data?.transactionId;
      localTransaction.completedAt = new Date();
      await localTransaction.save();
      console.log('Status Check: DB updated to SUCCESS');
    } else if (response.data.code === "PAYMENT_ERROR" || response.data.code === "INTERNAL_SERVER_ERROR") {
      localTransaction.status = "FAILED";
      await localTransaction.save();
      console.log('Status Check: DB updated to FAILED');
    }

    return res.json({
      success: true,
      data: {
        localTransaction: {
          id: localTransaction._id,
          merchantTransactionId: localTransaction.merchantTransactionId,
          status: localTransaction.status,
          amount: localTransaction.amount,
          student: localTransaction.studentID,
          createdAt: localTransaction.createdAt,
          completedAt: localTransaction.completedAt,
          description: localTransaction.description
        },
        phonepeStatus: response.data,
        apiUsed: 'PhonePe Official Test API',
        merchantId: PHONEPE_MERCHANT_ID
      }
    });

  } catch (error) {
    console.error("STATUS CHECK ERROR:", error);

    if (error.response) {
      return res.status(500).json({
        success: false,
        error: "PhonePe Official Test API error",
        details: error.response.data
      });
    }

    return res.status(500).json({
      success: false,
      error: "Status check failed",
      message: error.message
    });
  }
};

// 4. REDIRECT HANDLER
exports.handleRedirect = async (req, res) => {
  try {
    let txn = req.query.txn || req.body.txn;

    // Handle PhonePe POST redirect payload
    if (!txn && req.body.response) {
      try {
        const decoded = JSON.parse(Buffer.from(req.body.response, 'base64').toString());
        txn = decoded.merchantTransactionId || decoded.data?.merchantTransactionId;
        console.log('Decoded txn from POST response payload:', txn);
      } catch (e) {
        console.warn('Could not decode redirect response body:', e.message);
      }
    }

    console.log('=== REDIRECT RECEIVED ===');
    console.log('Method:', req.method);
    console.log('Transaction ID (txn):', txn);
    console.log('Referer:', req.headers.referer);

    if (!txn) {
      console.warn('Warning: No txn found in redirect request.');
      const frontendBaseUrl = process.env.CORS_URL || 'http://localhost:3000';
      return res.redirect(`${frontendBaseUrl}/student/fees?status=UNKNOWN`);
    }

    const Transactions = await req.getModel('transactions');
    let transaction = await Transactions.findOne({
      merchantTransactionId: txn
    });

    // If transaction is still pending, double check with PhonePe
    if (transaction && transaction.status === 'PENDING') {
      try {
        const checkEndpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${txn}`;
        const checksum = generateChecksum('', checkEndpoint);
        const headers = {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
          'accept': 'application/json'
        };
        const statusResponse = await axios.get(`${PHONEPE_BASE_URL}${checkEndpoint}`, { headers, timeout: 5000 });

        if (statusResponse.data.success && statusResponse.data.code === "PAYMENT_SUCCESS") {
          transaction.status = "SUCCESS";
          transaction.phonepeTransactionId = statusResponse.data.data?.transactionId;
          transaction.completedAt = new Date();
          await transaction.save();
        }
      } catch (stError) {
        console.error('Background status check failed in redirect:', stError.message);
      }
    }

    // Frontend URL for redirection
    const frontendBaseUrl = process.env.CORS_URL || 'http://localhost:3000';
    const finalStatus = transaction?.status || 'PENDING';
    const redirectTarget = `${frontendBaseUrl}/student/fees?status=${finalStatus}&txn=${txn}`;

    console.log('Redirecting user to:', redirectTarget);
    return res.redirect(redirectTarget);

  } catch (error) {
    console.error("REDIRECT ERROR:", error);
    const frontendBaseUrl = process.env.CORS_URL || 'http://localhost:3000';
    res.redirect(`${frontendBaseUrl}/student/fees?status=ERROR`);
  }
};

// 5. GET ALL TRANSACTIONS
exports.getAllTransactions = async (req, res) => {
  try {
    const Transactions = await req.getModel('transactions');
    const transactions = await Transactions.find()
      .populate('studentID', 'name userID')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: transactions.length,
      apiUsed: 'PhonePe Official Test API',
      merchantId: PHONEPE_MERCHANT_ID,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};