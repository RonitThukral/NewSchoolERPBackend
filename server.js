
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
const server = http.createServer(app); 
const io = new Server(server, { 
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

const { identifyTenant, validateTenantAccess } = require("./middlewares/tenantMiddleware");
const { attachTenantModels } = require("./middlewares/tenantModelHelper");
const { closeAllConnections } = require("./config/dbConnection");

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
const mongoose = require("mongoose"); 

const upload = multer({ dest: path.join(__dirname, "/uploads") });

app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 100000 })); 

app.use(cors({}));
app.use(express.static(path.join(__dirname, "consumerPhotos")));
app.use(express.static(path.join(__dirname, "public")));

app.use('/api', identifyTenant);
app.use('/api', attachTenantModels);

app.get("/", (req, res) => {
  res.send("Welcome to D-system API");
});

let requests = []; 

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
app.use("/api/academicyear", AcademicYear);
app.use("/api/chats", ChatRoutes);
app.use("/api/classes", ClassesRoutes);
app.use("/api/courses", CoursesRoutes);
app.use("/api/campuses", CampusRoutes);
app.use("/api/notes", FilesRoutes);
app.use("/api/notification", NotificationRoutes);
app.use("/api/transactions", Transactions);
app.use("/api/teachers", TeacherRoutes);
app.use("/api", DashboardRoutes);
app.use("/api/students", StudentRoutes);
app.use("/api/scholarships", ScholarshipRoutes);
app.use("/api/ssnit", SSNITRoutes);
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
app.use("/api/quiz", QuizRoutes);
app.use("/api/badges", BadgeRoutes);
app.use("/api/payment", PaymentRoutes); 

if (process.env.NODE_ENV === 'development') {
  app.use('/dev', require('./devRoutes'));
}
initializeSocket(io);

console.log('🏢 Multi-tenant mode enabled');
console.log('📊 Tenant databases will be connected on-demand');

const startServer = async () => {
  server.listen(PORT, () => {
    console.log(`🚀 School ERP Backend Server Started on port ${PORT}`);
  });
};

process.on('SIGTERM', async () => {
  await closeAllConnections();
  server.close();
});

process.on('SIGINT', async () => {
  await closeAllConnections();
  server.close(() => {
    process.exit(0);
  });
});

startServer();
