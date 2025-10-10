const express = require("express");
const StudentModel = require("../models/StudentModel");
const AttendanceModel = require("../models/AttendenceModel");
const TeacherModel = require("../models/TeacherModel");
const NoticeModel = require("../models/NoticeModel");
const { login, changePassword } = require("../middlewares/validate");
const { role } = require("../middlewares/variables");
const moment = require("moment");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const transport = require("../middlewares/Nodemailer");

const dt = new Date();
const month = dt.getMonth();
const year = dt.getFullYear();
const route = express.Router();

route.get("/", async (req, res) => {
  res.send("Shared routes are deprecated and should be removed in a future update.");
});

route.get("/users/search/:id", async (req, res) => {
  try {
    const searchId = req.params.id;
    const teachers = await TeacherModel.find({
      $or: [
        { userID: searchId },
        { name: { $regex: searchId, $options: "i" } },
        { surname: { $regex: searchId, $options: "i" } },
      ],
    });
    const students = await StudentModel.find({
      $or: [
        { userID: searchId },
        { name: { $regex: searchId, $options: "i" } },
        { surname: { $regex: searchId, $options: "i" } },
      ],
    });
    res.json({ success: true, data: [...teachers, ...students] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

route.get("/count/attendance", async (req, res) => {
  try {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOfMonth = moment().startOf('month');
    let attendanceCounts = [];

    for (let i = 0; i < daysInMonth; i++) {
      const day = startOfMonth.clone().add(i, 'days');
      const attendanceData = await AttendanceModel.find({
        date: {
          $gte: day.startOf('day').toDate(),
          $lte: day.endOf('day').toDate(),
        },
      });
      const totalAttendees = attendanceData.reduce((acc, curr) => acc + (curr.attendees ? curr.attendees.length : 0), 0);
      attendanceCounts.push({
        date: day.format('YYYY-MM-DD'),
        value: totalAttendees,
      });
    }
    res.json(attendanceCounts);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

route.get("/count/attendance/week/:start", async (req, res) => {
  try {
    const startDate = moment(req.params.start, "YYYY-MM-DD");
    let weeklyCounts = [];
    for (let i = 0; i < 7; i++) {
      const day = startDate.clone().add(i, 'days');
      const attendanceData = await AttendanceModel.find({
        date: {
          $gte: day.startOf('day').toDate(),
          $lte: day.endOf('day').toDate(),
        },
      });
      const totalAttendees = attendanceData.reduce((acc, curr) => acc + (curr.attendees ? curr.attendees.length : 0), 0);
      weeklyCounts.push({
        date: day.format('YYYY-MM-DD'),
        value: totalAttendees,
      });
    }
    res.json(weeklyCounts);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//find user by id
route.get("/user/:id", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Missing URL parameter: userID" });
    }
    const user = await StudentModel.findOne({ userID: req.params.id }) || await TeacherModel.findOne({ userID: req.params.id });
    if (!user) {
      return res.status(404).json({ success: false, error: "User does not exist" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//upload profile
route.post("/update/profile/:id", async (req, res) => {
  try {
    let user = await StudentModel.findOneAndUpdate({ userID: req.params.id }, req.body, { new: true });
    if (!user) {
      user = await TeacherModel.findOneAndUpdate({ userID: req.params.id }, req.body, { new: true });
    }
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//forget password
route.post("/forgetpassword", async (req, res) => {
  const user = await StudentModel.findOne({
    userID: req.body.userID,
  });
  if (!user) {
    return res.status(404).json({ error: "Wrong userID" });
  }
  if (user.email !== req.body.email) {
    return res.status(400).json({ error: "Wrong email" });
  }

  try {
    const token = crypto.randomBytes(20).toString("hex");
    user.resetPassowrdToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: user.email,
      subject: "Link to reset Password",
      html: `<p>You are receiving this because you (or someone else) has requested the reset of your password. Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:</p><p><a href="${process.env.FRONT_END}/password/reset/${token}">${process.env.FRONT_END}/password/reset/${token}</a></p><p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
    };

    await transport.sendMail(mailOptions);
    res.json({ success: true, message: "Password reset email sent." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//reset password
route.post("/resetpassword", async (req, res) => {
  try {
    const user = await StudentModel.findOne({
      resetPassowrdToken: req.body.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: "Password reset token is invalid or has expired." });
    }

    const hash = await bcrypt.hash(req.body.password, 10);
    user.password = hash;
    user.resetPassowrdToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: "Password has been reset successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//change password
route.post("/change/password/:id", async (req, res) => {
  try {
    const { error } = changePassword.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    let user = await StudentModel.findOne({ userID: req.params.id });
    if (!user) {
      user = await TeacherModel.findOne({ userID: req.params.id });
    }

    if (!user) {
      return res.status(404).json({ success: false, error: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(req.body.oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Wrong old password" });
    }

    const hash = await bcrypt.hash(req.body.newPassword, 10);
    user.password = hash;
    await user.save();

    res.json({ success: true, message: "Password successfully changed" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

route.delete("/user/delete/:id", async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: username");
  }
  try {
    let doc = await StudentModel.findOneAndDelete({ userID: req.params.id });
    if (!doc) {
      doc = await TeacherModel.findOneAndDelete({ userID: req.params.id });
    }
    if (!doc) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, message: `User ${req.params.id} is successfully DELETED` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = route;
