const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Changing to bcryptjs to avoid potential binding issues if bcrypt is native

// Connection string - assuming default local from project context or standard
const MONGODB_URI = "mongodb://localhost:27017/school_erp_db"; // Replace with actual if known

async function createTestTeacher() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // We need to access the Tenant/School DB dynamically if multi-tenant, 
    // but usually local dev uses a single DB or we need to find the specific school DB.
    // Let's assume 'school_erp_db' or check what the app uses.
    // The codebase seems to use `req.getModel`, implying dynamic binding.
    // However, for a simple seed, we might need to know the database name.
    
    // Let's first LIST databases to find the right one if we can, or just try to insert into a likely default.
    // Actually, `newschoolerpbackend` likely has a .env file.
    
    const TeacherSchema = new mongoose.Schema({
        userID: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, default: 'teacher' },
        name: { type: String, required: true },
        surname: { type: String, required: true },
        email: { type: String, unique: true },
        campusID: { type: mongoose.Schema.Types.ObjectId, ref: 'campus' }, // needs a valid ID
        gender: { type: String, default: 'Male' },
        isStaff: { type: Boolean, default: true },
    }, { strict: false });

    const CampusSchema = new mongoose.Schema({
        name: { type: String },
    }, { strict: false });

    const TeacherModel = mongoose.model('teachers', TeacherSchema);
    const CampusModel = mongoose.model('campus', CampusSchema);

    // Find a campus
    const campus = await CampusModel.findOne({});
    if (!campus) {
        console.log("No campus found! Creating one...");
        const newCampus = await CampusModel.create({ name: "Main Campus", code: "MAIN" });
        console.log("Created Campus:", newCampus._id);
    }
    
    const validCampus = await CampusModel.findOne({});

    const testTeacher = {
        userID: "TEACHER001",
        password: await bcrypt.hash("password123", 10),
        name: "John",
        surname: "Doe",
        email: "teacher@test.com",
        role: "teacher",
        campusID: validCampus._id,
        isStaff: true,
        employmentStatus: 'active',
        gender: 'Male',
        mobilenumber: '1234567890'
    };

    // Check if exists
    const exists = await TeacherModel.findOne({ userID: testTeacher.userID });
    if (exists) {
        console.log("Test teacher already exists (TEACHER001). Updating password...");
        await TeacherModel.updateOne({ userID: testTeacher.userID }, { password: testTeacher.password });
        console.log("Password updated to 'password123'");
    } else {
        await TeacherModel.create(testTeacher);
        console.log("Test teacher created: TEACHER001 / password123");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    if(mongoose.connection.readyState === 1) await mongoose.disconnect();
  }
}

createTestTeacher();
