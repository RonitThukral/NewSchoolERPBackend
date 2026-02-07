/**
 * EXAMPLE: TENANT-AWARE STUDENT CONTROLLER
 * 
 * This is an example showing how to update controllers to work with multi-tenancy.
 * The key change is using req.getModel() instead of directly importing models.
 * 
 * BEFORE (Single Tenant):
 * const Student = require('../models/StudentModel');
 * const students = await Student.find();
 * 
 * AFTER (Multi-Tenant):
 * const Student = await req.getModel('students');
 * const students = await Student.find();
 */

const bcrypt = require("bcrypt");

/**
 * Get all active students (Multi-tenant version)
 */
exports.getAllActiveStudents = async (req, res) => {
    const { user, query } = req;
    try {
        // Get the tenant-specific Student model
        const Student = await req.getModel('students');

        // Build the campus filter based on user role
        let campusFilter = {};
        if (user.campusID) { // This is a Campus Admin
            const campusId = query.campusID || user.campusID?._id;
            if (campusId) campusFilter.campusID = campusId;
        } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
            campusFilter.campusID = query.campusID;
        }

        const data = await Student.find({
            enrollmentStatus: "active",
            ...campusFilter,
        })
            .populate('classID', 'name classCode')
            .populate('campusID', 'name')
            .populate('scholarship', 'name discountType discountValue')
            .populate({ path: 'classHistory.classID', select: 'name classCode' })
            .sort({ createdAt: "desc" });

        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get student by ID (Multi-tenant version)
 */
exports.getStudentById = async (req, res) => {
    try {
        // Get the tenant-specific Student model
        const Student = await req.getModel('students');

        const student = await Student.findOne({ userID: req.params.id })
            .populate([
                { path: 'classID', select: 'name classCode' },
                { path: 'campusID', select: 'name' },
                { path: 'scholarship', select: 'name discountType discountValue' },
                { path: 'classHistory.classID', select: 'name classCode' }
            ]);

        if (student) {
            return res.json({ success: true, student });
        }
        res.status(404).json({ success: false, error: "Student does not exist" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Create new student (Multi-tenant version)
 */
exports.createStudent = async (req, res) => {
    try {
        // Get the tenant-specific Student model
        const Student = await req.getModel('students');

        // Generate unique user ID
        let finalUserID = req.body.setuserID;
        if (!finalUserID) {
            const currentYear = new Date().getFullYear();
            let isUnique = false;
            let counter = await Student.countDocuments();

            while (!isUnique) {
                counter++;
                const potentialUserID = `BK${currentYear}${counter}`;
                const studentExists = await Student.findOne({ userID: potentialUserID });
                if (!studentExists) {
                    finalUserID = potentialUserID;
                    isUnique = true;
                }
            }
        }

        const hash = await bcrypt.hash(finalUserID, 10);
        const studentData = { ...req.body, password: hash, userID: finalUserID };

        // Campus security: Force student's campus to admin's campus
        if (req.user.campusID) {
            studentData.campusID = req.user.campusID._id;
        }

        const newUser = await Student.create(studentData);

        // Populate the necessary fields
        const populatedUser = await newUser.populate([
            { path: 'classID', select: 'name classCode' },
            { path: 'campusID', select: 'name' },
            { path: 'scholarship', select: 'name discountType discountValue' },
            { path: 'classHistory.classID', select: 'name classCode' }
        ]);

        res.status(201).json({ success: true, student: populatedUser });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                error: "A student with this User ID or Email already exists."
            });
        }
        res.status(500).json({
            success: false,
            error: "Something went wrong",
            details: err.message
        });
    }
};

/**
 * Update student (Multi-tenant version)
 */
exports.updateStudent = async (req, res) => {
    try {
        // Get the tenant-specific Student model
        const Student = await req.getModel('students');

        const doc = await Student.findOneAndUpdate(
            { userID: req.params.id },
            req.body,
            { new: true }
        )
            .populate([
                { path: 'classID', select: 'name classCode' },
                { path: 'campusID', select: 'name' },
                { path: 'scholarship', select: 'name discountType discountValue' },
                { path: 'classHistory.classID', select: 'name classCode' }
            ]);

        if (!doc) {
            return res.status(404).json({ success: false, error: "Student does not exist" });
        }

        res.json({ success: true, student: doc });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                error: "Update failed. Email or other unique field already in use."
            });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Delete student (Multi-tenant version)
 */
exports.deleteStudent = async (req, res) => {
    try {
        // Get the tenant-specific Student model
        const Student = await req.getModel('students');

        const doc = await Student.findOneAndDelete({ userID: req.params.id });
        if (!doc) {
            return res.status(404).json({ success: false, error: "Student not found" });
        }
        res.json({
            success: true,
            message: `Student ${req.params.id} was successfully deleted.`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Example of using multiple models in one controller
 */
exports.getStudentWithRelatedData = async (req, res) => {
    try {
        // You can get multiple models at once
        const Student = await req.getModel('students');
        const Classes = await req.getModel('classes');
        const Fees = await req.getModel('fees');

        const student = await Student.findOne({ userID: req.params.id });
        if (!student) {
            return res.status(404).json({ success: false, error: "Student not found" });
        }

        const studentClass = await Classes.findById(student.classID);
        const feeStructure = await Fees.findOne({ code: student.classID });

        res.json({
            success: true,
            data: {
                student,
                class: studentClass,
                fees: feeStructure
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ============================================
// MIGRATION GUIDE FOR EXISTING CONTROLLERS
// ============================================
/*

STEP 1: Remove static model imports at the top
-----------------------------------------
BEFORE:
const StudentModel = require('../models/StudentModel');
const ClassesModel = require('../models/ClassesModel');

AFTER:
// No need to import models anymore


STEP 2: Get models dynamically in your controller functions
-----------------------------------------
BEFORE:
exports.myFunction = async (req, res) => {
  const students = await StudentModel.find();
  ...
}

AFTER:
exports.myFunction = async (req, res) => {
  const Student = await req.getModel('students');
  const students = await Student.find();
  ...
}


STEP 3: Update all model references
-----------------------------------------
Search for all occurrences of your model imports and replace them with req.getModel() calls.

Model Name Mapping:
- StudentModel → req.getModel('students')
- TeacherModel → req.getModel('teachers')
- ClassesModel → req.getModel('classes')
- CoursesModel → req.getModel('courses')
- AttendanceModel → req.getModel('attendances')
- FeesModel → req.getModel('fees')
- TransactionsModel → req.getModel('transactions')
- CampusModel → req.getModel('campus')
- ScholarshipModel → req.getModel('scholarships')
- And so on... (check tenantModelHelper.js for full list)


STEP 4: Ensure routes have the tenant middleware
-----------------------------------------
Make sure your routes use the tenant middleware (it's already applied globally to /api/* routes)

That's it! Your controller is now multi-tenant aware.

*/
