const SBAModel = require("../models/SBAModel");
const StudentModel = require("../models/StudentModel");
const { role } = require("../middlewares/variables");
const CoursesModel = require("../models/CoursesModel");
const mongoose = require("mongoose");
const SchoolProfileModel = require("../models/SchoolProfileModel");
const ClassesModel = require("../models/ClassesModel");

exports.getAllSBA = async (req, res) => {
  const { user, query } = req;
  try {
    // Build the campus filter based on user role
    let campusFilter = {};
    if (user.campusID) { // This is a Campus Admin
      // Admins default to their own campus, but can view others via query param
      const campusId = query.campusID || user.campusID?._id;
      if (campusId) campusFilter.campusID = campusId;
    } else if (!user.campusID && query.campusID) { // This is a Global Admin filtering by campus
      // Global admins can filter by any campus
      campusFilter.campusID = query.campusID;
    }

    const data = await SBAModel.find(campusFilter).sort({ createdAt: "desc" });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getSBAById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
  }
  try {
    const doc = await SBAModel.findById(req.params.id);
    if (doc) {
      return res.json({ success: true, doc });
    }
    res.status(404).json({ success: false, error: "SBA record not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getStudentResults = async (req, res) => {
  const { id: userID, year, term } = req.params;
  try {
    // 1. Find the student to get their MongoDB _id
    const student = await StudentModel.findOne({ userID }).select('_id');
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found." });
    }

    // 2. Find all SBA records for that student in the given period, and populate course details
    const sbaDocs = await SBAModel.find({
      academicYear: year,
      term: term,
      "scores.studentID": student._id
    }).populate('courseID', 'name courseCode').lean(); // Use .lean() for faster read-only queries

    if (!sbaDocs || sbaDocs.length === 0) {
      return res.status(404).json({ success: false, error: "No SBA records found for this student in the specified period." });
    }

    // 3. Extract and format the results for that specific student from all found documents
    const results = sbaDocs.map(doc => {
      const studentScore = doc.scores.find(score => score.studentID.toString() === student._id.toString());
      return {
        courseName: doc.courseID.name,
        courseCode: doc.courseID.courseCode,
        classWorkScore: studentScore.classWorkScore,
        examScore: studentScore.examScore,
        totalScore: studentScore.totalScore,
        grade: studentScore.grade,
        position: studentScore.position,
        remarks: studentScore.remarks,
        maxClassWorkScore: doc.maxClassWorkScore,
        maxExamScore: doc.maxExamScore,
        academicYear: doc.academicYear,
        term: doc.term
      };
    });

    res.json({ success: true, docs: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getStudentAcademicReport = async (req, res) => {
  const { userID, year, term } = req.params;

  if (!userID || !year || !term) {
    return res.status(400).json({ success: false, error: "userID, year, and term are required parameters." });
  }

  try {
    // 1. Find the student and populate their class info
    const student = await StudentModel.findOne({ userID }).populate('classID', 'name').lean();
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found." });
    }

    // 2. Find all SBA records for that student in the given period
    const sbaDocs = await SBAModel.find({
      academicYear: year,
      term: term,
      "scores.studentID": student._id
    }).populate('courseID', 'name courseCode').lean();

    if (!sbaDocs || sbaDocs.length === 0) {
      return res.status(404).json({ success: false, error: "No academic records found for this student in the specified period." });
    }

    let totalMarksObtained = 0;
    let totalMaxMarks = 0;

    // 3. Extract results and calculate totals
    const subjectResults = sbaDocs.map(doc => {
      const studentScore = doc.scores.find(score => score.studentID.toString() === student._id.toString());
      const maxScoreForSubject = (doc.maxClassWorkScore || 0) + (doc.maxExamScore || 0);

      totalMarksObtained += studentScore.totalScore || 0;
      totalMaxMarks += maxScoreForSubject;

      return {
        courseName: doc.courseID.name,
        courseCode: doc.courseID.courseCode,
        classWorkScore: studentScore.classWorkScore,
        examScore: studentScore.examScore,
        totalScore: studentScore.totalScore,
        grade: studentScore.grade,
        remarks: studentScore.remarks,
        maxScore: maxScoreForSubject,
      };
    });

    // 4. Calculate overall percentage
    const overallPercentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;

    // 5. Fetch school profile for the report header
    const schoolInfo = await SchoolProfileModel.findOne({ campusID: student.campusID }).select('name logoUrl').lean();

    // 6. Assemble the final report object
    const report = {
      studentInfo: { name: `${student.name} ${student.surname}`, userID: student.userID, className: student.classID?.name },
      schoolInfo: schoolInfo || { name: "School Name Not Set" },
      academicPeriod: { year, term },
      subjectResults,
      summary: { totalMarksObtained, totalMaxMarks, overallPercentage: parseFloat(overallPercentage.toFixed(2)) }
    };

    res.json({ success: true, report });
  } catch (err) {
    console.error("Error generating student academic report:", err);
    res.status(500).json({ success: false, error: "Server error while generating report." });
  }
};

exports.getClassCourseResults = async (req, res) => {
  const { class: classId, course: courseId, year, term } = req.params;
  const { user } = req;
  try {
    // 1. Validate and convert IDs from string to ObjectId
    const classObjectId = mongoose.Types.ObjectId(classId);
    const courseObjectId = mongoose.Types.ObjectId(courseId);

    // --- CAMPUS AUTHORIZATION ---
    // If the user is a campus admin, ensure the requested class belongs to their campus.
    // Global admins (no campusID) can view any campus.
    if (user.campusID) { // This check only applies to Campus Admins
      const classDoc = await ClassesModel.findById(classObjectId).select('campusID').lean();
      if (!classDoc) {
        return res.status(404).json({ success: false, error: "Class not found." });
      }
      if (classDoc.campusID.toString() !== user.campusID.toString()) {
        return res.status(403).json({ success: false, error: "You are not authorized to view results for this campus." });
      }
    }

    // 2. Get all active students in the class
    const students = await StudentModel.find({
      classID: classObjectId,
      enrollmentStatus: 'active'
    }).select('name surname userID').lean();

    // 3. Find the existing SBA record
    const sbaRecord = await SBAModel.findOne({
      classID: classObjectId,
      courseID: courseObjectId,
      academicYear: year,
      term: term
    }).lean();

    if (sbaRecord) {
      // 4a. If record exists, merge student list with scores for the response
      const scoreMap = new Map(sbaRecord.scores.map(score => [score.studentID.toString(), score]));
      const mergedScores = students.map(student => {
        const scoreData = scoreMap.get(student._id.toString());
        return {
          studentID: student._id,
          name: `${student.name} ${student.surname}`,
          userID: student.userID,
          classWorkScore: scoreData?.classWorkScore || 0,
          examScore: scoreData?.examScore || 0,
          totalScore: scoreData?.totalScore || 0,
          grade: scoreData?.grade || '',
          position: scoreData?.position || '',
          remarks: scoreData?.remarks || ''
        };
      });

      const responseDoc = { ...sbaRecord, scores: mergedScores };
      return res.json({ success: true, doc: responseDoc });
    }

    // 4b. If record does not exist, create a new one
    const newSbaData = { classID: classObjectId, courseID: courseObjectId, academicYear: year, term: term, scores: students.map(s => ({ studentID: s._id })) };
    const createdDoc = await SBAModel.create(newSbaData);

    // Prepare the response with student details for the frontend UI
    const newScores = students.map(student => ({ studentID: student._id, name: `${student.name} ${student.surname}`, userID: student.userID, classWorkScore: 0, examScore: 0, totalScore: 0, grade: '', position: '', remarks: '' }));
    const responseDoc = { ...createdDoc.toObject(), scores: newScores };

    res.status(200).json({ success: true, doc: responseDoc, isNew: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.updateSBA = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
  }
  try {
    const sbaDoc = await SBAModel.findById(req.params.id);
    if (!sbaDoc) {
      return res.status(404).json({ success: false, error: "SBA record not found." });
    }
    // --- DATA INTEGRITY FIX: Recalculate total scores before saving ---
    if (req.body.scores && Array.isArray(req.body.scores)) {
      req.body.scores.forEach(score => {
        score.totalScore = (Number(score.classWorkScore) || 0) + (Number(score.examScore) || 0);
      });
    }

    const doc = await SBAModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: "SBA record not found" });
    }
    res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteSBA = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ success: false, error: "Missing URL parameter: id" });
  }
  try {
    const doc = await SBAModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "SBA record not found" });
    }
    res.json({ success: true, message: "SBA record deleted successfully", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};