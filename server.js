// const express = require("express");
// const bodyParser = require("body-parser");
// const cors = require("cors");
// const dotenv = require("dotenv");
// const multer = require("multer");
// const path = require("path");

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Route Imports
// const ActivityRoutes = require("./routes/ActivityRoutes");
// const AcademicYear = require("./routes/CurrentYearRoutes");
// const StudentRoutes = require("./routes/StudentRoutes");
// const PayrowRoutes = require("./routes/PayrowRoutes");
// const AttendanceRoutes = require("./routes/AttendanceRoutes");
// const ChatRoutes = require("./routes/ChatRoutes");
// const CoursesRoutes = require("./routes/CoursesRoutes");
// const ClassesRoutes = require("./routes/ClassesRoutes");
// const CampusRoutes = require("./routes/CampusRoutes");
// const CorrespondanceRoutes = require("./routes/CorrespondanceRoutes");
// const YearGroupRoutes = require("./routes/YeargroupRoutes");
// const CalendarRoutes = require("./routes/CalendarRoutes");
// const DormitoriesRoutes = require("./routes/DormitoriesRoutes");
// const PrefectsRoutes = require("./routes/PrefectsRoutes");
// const FilesRoutes = require("./routes/FilesRoutes");
// const NotificationRoutes = require("./routes/NotificationRoutes");
// const TaskRoutes = require("./routes/TaskRoutes");
// const Transactions = require("./routes/TransactionsRoutes");
// const TeacherRoutes = require("./routes/TeacherRoutes");
// const SchoolRoutes = require("./routes/SchoolRoutes");
// const PaymentPlanRoutes = require("./routes/PaymentPlanRoutes");
// const SharedRoutes = require("./routes/SharedRoutes");
// const SSNITRoutes = require("./routes/SSNITRoutes");
// const StaffPay = require("./routes/StaffPayRoutes");
// const ScholarshipRoutes = require("./routes/ScholarshipRoutes");
// const SectionRoutes = require("./routes/SectionRoutes");
// const DepartmentsRoutes = require("./routes/DepartmentRoutes");
// const DivisionRoutes = require("./routes/DivisionRoutes");
// const DeductionsRoutes = require("./routes/DeductionsRoutes");
// const UploadsRoutes = require("./routes/Uploads");
// const CanteenRoutes = require("./routes/CanteenRouter");
// const BankingRoutes = require("./routes/BankingRoutes");
// const FeesRoutes = require("./routes/FeesRoutes");
// const StoreItems = require("./routes/StoreItemsRoutes");
// const StoreSales = require("./routes/StoreSalesRoutes");
// const UsersRoutes = require("./routes/UsersRoutes");
// const SBARoutes = require("./routes/SBARoutes");
// const NonPaymentRoutes = require("./routes/NonBillPaymentRoutes");

// // Multer setup for file upload
// const upload = multer({ dest: path.join(__dirname, "/uploads") });

// // Middleware
// app.use(bodyParser.json({ limit: "50mb" }));
// app.use(bodyParser.urlencoded({ limit: "50mb", parameterLimit: 100000, extended: true }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cors({
//   origin: 'http://localhost:3000', // replace with your frontend URL
//   credentials: true,
// }));
// app.use(express.static(path.join(__dirname, "consumerPhotos")));
// app.use(express.static(path.join(__dirname, "public")));

// // Routes
// app.get("/", (req, res) => {
//   res.send("Welcome to D-system API");
// });

// // Define Routes
// app.use("/api/students", StudentRoutes);

// // Example Routes for Bulk Operations
// app.post("/api/students/upload", upload.single("file"), (req, res) => {
//   // Ensure bulkInsertStudents is defined in StudentRoutes
//   if (typeof StudentRoutes.bulkInsertStudents === 'function') {
//     StudentRoutes.bulkInsertStudents(req, res);
//   } else {
//     res.status(500).send("Bulk insert handler not defined");
//   }
// });
// app.post("/api/students/bulk-delete", (req, res) => {
//   // Ensure bulkDeleteStudents is defined in StudentRoutes
//   if (typeof StudentRoutes.bulkDeleteStudents === 'function') {
//     StudentRoutes.bulkDeleteStudents(req, res);
//   } else {
//     res.status(500).send("Bulk delete handler not defined");
//   }
// });
// app.post("/api/students/bulk-update", upload.single("file"), (req, res) => {
//   // Ensure bulkUpdateStudents is defined in StudentRoutes
//   if (typeof StudentRoutes.bulkUpdateStudents === 'function') {
//     StudentRoutes.bulkUpdateStudents(req, res);
//   } else {
//     res.status(500).send("Bulk update handler not defined");
//   }
// });

// let requests = []; // Array to store the requests

// app.post('/api/requests', (req, res) => {
//   const newRequest = { id: Date.now(), ...req.body };
//   requests.push(newRequest);
//   res.status(201).send(newRequest);
// });

// app.get('/api/requests', (req, res) => {
//   res.send(requests);
// });

// app.patch('/api/requests/:id', (req, res) => {
//   const { id } = req.params;
//   const { status, rejectReason } = req.body;
//   const request = requests.find((req) => req.id === Number(id));
//   if (request) {
//     request.status = status;
//     request.rejectReason = rejectReason;
//     res.send(request);
//   } else {
//     res.status(404).send('Request not found');
//   }
// });

// console.log(requests)

// app.use("/api/activitylog", ActivityRoutes);
// app.use("/api/attendance", AttendanceRoutes);
// app.use("/api/academicyear", AcademicYear);
// app.use("/api/chats", ChatRoutes);
// app.use("/api/classes", ClassesRoutes);
// app.use("/api/courses", CoursesRoutes);
// app.use("/api/campuses", CampusRoutes);
// app.use("/api/calendar", CalendarRoutes);
// app.use("/api/correspondance", CorrespondanceRoutes);
// app.use("/api/yeargroup", YearGroupRoutes);
// app.use("/api/dormitories", DormitoriesRoutes);
// app.use("/api/notes", FilesRoutes);
// app.use("/api/notification", NotificationRoutes);
// app.use("/api/tasks", TaskRoutes);
// app.use("/api/transactions", Transactions);
// app.use("/api/teachers", TeacherRoutes);
// app.use("/api", SharedRoutes);
// app.use("/api/scholarships", ScholarshipRoutes);
// app.use("/api/staffpay", StaffPay);
// app.use("/api/ssnit", SSNITRoutes);
// app.use("/api/sections", SectionRoutes);
// app.use("/api/school", SchoolRoutes);
// app.use("/api/prefects", PrefectsRoutes);
// app.use("/api/paymentplan", PaymentPlanRoutes);
// app.use("/api/payrow", PayrowRoutes);
// app.use("/api/upload", UploadsRoutes);
// app.use("/api/departments", DepartmentsRoutes);
// app.use("/api/divisions", DivisionRoutes);
// app.use("/api/canteen", CanteenRoutes);
// app.use("/api/banking", BankingRoutes);
// app.use("/api/fees", FeesRoutes);
// app.use("/api/store/items", StoreItems);
// app.use("/api/store/sales", StoreSales);
// app.use("/api/users", UsersRoutes);
// app.use("/api/sba", SBARoutes);
// app.use("/api/deductions", DeductionsRoutes);
// app.use("/api/nonbillpayment", NonPaymentRoutes);

// // Start Server
// app.listen(PORT, () => {
//   console.log(`Listening on port ${PORT}`);
// });

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app
const io = new Server(server, { // Initialize Socket.IO
  cors: {
    origin: "*", // Adjust for your frontend URL in production
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

// Route Imports
const ActivityRoutes = require("./routes/ActivityRoutes");
const AcademicYear = require("./routes/CurrentYearRoutes");
const StudentRoutes = require("./routes/StudentRoutes");
const PayrowRoutes = require("./routes/PayrowRoutes");
const AttendanceRoutes = require("./routes/AttendanceRoutes");
const ChatRoutes = require("./routes/ChatRoutes");
const CoursesRoutes = require("./routes/CoursesRoutes");
const ClassesRoutes = require("./routes/ClassesRoutes");
const CampusRoutes = require("./routes/CampusRoutes");
const PrefectsRoutes = require("./routes/PrefectsRoutes");
const FilesRoutes = require("./routes/FilesRoutes");
const NotificationRoutes = require("./routes/NotificationRoutes");
const Transactions = require("./routes/TransactionsRoutes");
const TeacherRoutes = require("./routes/TeacherRoutes");
const SchoolRoutes = require("./routes/SchoolRoutes");
const DashboardRoutes = require("./routes/DashboardRoutes");
const SSNITRoutes = require("./routes/SSNITRoutes");
const StaffPay = require("./routes/StaffPayRoutes");
const ScholarshipRoutes = require("./routes/ScholarshipRoutes");
const DeductionsRoutes = require("./routes/DeductionsRoutes");
const UploadsRoutes = require("./routes/Uploads");
const BankingRoutes = require("./routes/BankingRoutes");
const FeesRoutes = require("./routes/FeesRoutes");
const StoreItems = require("./routes/StoreItemsRoutes");
const StoreSales = require("./routes/StoreSalesRoutes");
const SBARoutes = require("./routes/SBARoutes");
const ImageRoutes = require("./routes/ImageRoutes");
const HomeWorkRoutes = require("./routes/HomeWorkRoutes");
const SmsRoute = require("./routes/SmsRoute");
const LeaveApplicationRoute = require("./routes/LeaveApplicationRoute");
const PaymentRoutes = require("./routes/paymentRoutes");
const QuizRoutes = require("./routes/QuizRoutes");
const BadgeRoutes = require("./routes/BadgeRoutes");
const initializeSocket = require("./services/socketService");
const mongoose = require("mongoose"); // Import Mongoose

// Multer setup for file upload
const upload = multer({ dest: path.join(__dirname, "/uploads") });

// Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    parameterLimit: 100000,
    extended: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    // origin: process.env.CORS_URL, // replace with your frontend URL
    // credentials: true,
  })
);
app.use(express.static(path.join(__dirname, "consumerPhotos")));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to D-system API");
});

// Define Routes
app.use("/api/students", StudentRoutes);

// Example Routes for Bulk Operations
app.post("/api/students/upload", upload.single("file"), (req, res) => {
  // Ensure bulkInsertStudents is defined in StudentRoutes
  if (typeof StudentRoutes.bulkInsertStudents === "function") {
    StudentRoutes.bulkInsertStudents(req, res);
  } else {
    res.status(500).send("Bulk insert handler not defined");
  }
});
app.post("/api/students/bulk-delete", (req, res) => {
  // Ensure bulkDeleteStudents is defined in StudentRoutes
  if (typeof StudentRoutes.bulkDeleteStudents === "function") {
    StudentRoutes.bulkDeleteStudents(req, res);
  } else {
    res.status(500).send("Bulk delete handler not defined");
  }
});
app.post("/api/students/bulk-update", upload.single("file"), (req, res) => {
  // Ensure bulkUpdateStudents is defined in StudentRoutes
  if (typeof StudentRoutes.bulkUpdateStudents === "function") {
    StudentRoutes.bulkUpdateStudents(req, res);
  } else {
    res.status(500).send("Bulk update handler not defined");
  }
});

let requests = []; // Array to store the requests

app.post("/api/requests", (req, res) => {
  const newRequest = { id: Date.now(), ...req.body };
  requests.push(newRequest);
  res.status(201).send(newRequest);
});

app.get("/api/requests", (req, res) => {
  res.send(requests);
});

app.patch("/api/requests/:id", (req, res) => {
  const { id } = req.params;
  const { status, rejectReason } = req.body;
  const request = requests.find((req) => req.id === Number(id));
  if (request) {
    request.status = status;
    request.rejectReason = rejectReason;
    res.send(request);
  } else {
    res.status(404).send("Request not found");
  }
});

console.log(requests);

app.use("/api/activitylog", ActivityRoutes);
app.use("/api/attendance", AttendanceRoutes);
app.use("/api/academicyear", AcademicYear); // Removed as requested
app.use("/api/chats", ChatRoutes);
app.use("/api/classes", ClassesRoutes);
app.use("/api/courses", CoursesRoutes);
app.use("/api/campuses", CampusRoutes);
app.use("/api/notes", FilesRoutes);
app.use("/api/notification", NotificationRoutes);
app.use("/api/transactions", Transactions);
app.use("/api/teachers", TeacherRoutes);
app.use("/api", DashboardRoutes);
app.use("/api/scholarships", ScholarshipRoutes);
// app.use("/api/staffpay", StaffPay); // Commented out to ensure startup
app.use("/api/ssnit", SSNITRoutes); // Commented out to ensure startup
app.use("/api/school", SchoolRoutes);
app.use("/api/prefects", PrefectsRoutes);
app.use("/api/payrow", PayrowRoutes);
app.use("/api/upload", UploadsRoutes);
app.use("/api/banking", BankingRoutes);
app.use("/api/fees", FeesRoutes);
app.use("/api/store/items", StoreItems);
app.use("/api/store/sales", StoreSales);
app.use("/api/sba", SBARoutes);
app.use("/api/deductions", DeductionsRoutes);
app.use("/api/images", ImageRoutes);
app.use("/api/homeworks", HomeWorkRoutes);
app.use("/api/leave-applications", LeaveApplicationRoute);
app.use("/api/payment", PaymentRoutes);
app.use("/api/quiz", QuizRoutes);
app.use("/api/badges", BadgeRoutes);

// --- DEVELOPMENT-ONLY ROUTES ---
// These routes are only loaded when the environment is 'development'
if (process.env.NODE_ENV === 'development') {
  console.warn('***********************************************************************************');
  console.warn('** ATTENTION: Loading development-only routes. DO NOT expose these in production! **');
  console.warn('***********************************************************************************');
  app.use('/dev', require('./routes/devRoutes'));
}
// Initialize Socket.IO logic
initializeSocket(io);

// --- DATABASE CONNECTION ---
const connectDB = async () => {
  try {
    // Use the variable from your .env file
    await mongoose.connect(process.env.LOCAL_DB_CONNECT);
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    // Exit process with failure
    process.exit(1);
  }
};

// Start Server
const startServer = async () => {
  await connectDB(); // Connect to the database first
  server.listen(PORT, () => { // Then start the server
    console.log(`Listening on port ${PORT}`);
  });
};

startServer();
