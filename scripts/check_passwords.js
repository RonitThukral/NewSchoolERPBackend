const mongoose = require("mongoose");
const StudentModel = require("../models/StudentModel"); // Adjust path if needed
const bcrypt = require("bcrypt");
require("dotenv").config({ path: "../.env" }); // Load env from parent dir

const checkStudentPasswords = async () => {
    try {
        await mongoose.connect(process.env.LOCAL_DB_CONNECT || "mongodb://localhost:27017/schoolTest"); // Use local DB or env
        console.log("Connected to DB");

        const students = await StudentModel.find({ role: "student" }).limit(5); // Check first 5 students

        console.log("Verifying password == userID for first 5 students:");
        for (const s of students) {
            if (!s.password) {
                console.log(`Student ${s.userID}: No password set.`);
                continue;
            }
            const isMatch = await bcrypt.compare(s.userID, s.password);
            console.log(`Student ${s.userID}: Password matches UserID? ${isMatch}`);
        }

        mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
        mongoose.disconnect();
    }
};

checkStudentPasswords();
