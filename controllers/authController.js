/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import bcrypt from "bcrypt";
import { User, Personnel, Assignment, Attendance, Document, Shift, AuditLog, Booking, sequelize } from "../models/associations.js";
import { createAuditLog } from "../middleware/auditLog.js";
import { Op } from "sequelize";

export const loginPage = (req, res) => {
  let successMsg = req.flash("success_msg");
  if (req.query.loggedOut && (!successMsg || successMsg.length === 0)) {
    successMsg = ["You have been successfully logged out."];
  }
  res.render("login", {
    title: "Login - JailPersonnel",
    error_msg: req.flash("error_msg"),
    success_msg: successMsg
  });
};

export const registerPage = (req, res) => {
  res.render("register", {
    title: "Register - JailPersonnel",
    error_msg: req.flash("error_msg")
  });
};

export const forgotPasswordPage = (req, res) => {
  res.render("forgotpassword", {
    title: "Forgot Password - JailPersonnel",
    error_msg: req.flash("error_msg"),
    success_msg: req.flash("success_msg")
  });
};

export const postForgotPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      req.flash("error_msg", "All fields are required");
      return res.redirect("/forgot-password");
    }

    if (newPassword !== confirmPassword) {
      req.flash("error_msg", "Passwords do not match");
      return res.redirect("/forgot-password");
    }

    if (newPassword.length < 6) {
      req.flash("error_msg", "Password must be at least 6 characters");
      return res.redirect("/forgot-password");
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      req.flash("error_msg", "No account registered with this email address");
      return res.redirect("/forgot-password");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await createAuditLog(user.id, "PASSWORD_RESET", "User", user.id, null, null, req);

    req.flash("success_msg", "Your password has been reset successfully. Please log in.");
    res.redirect("/login");
  } catch (err) {
    console.error("Forgot password error:", err);
    req.flash("error_msg", "An error occurred during password reset");
    res.redirect("/forgot-password");
  }
};

export const dashboardPage = async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const todayStr = new Date().toISOString().split("T")[0];

    // Core Metrics
    const totalPersonnel = await Personnel.count();
    const activePersonnel = await Personnel.count({ where: { status: "active" } });
    const totalAssignments = await Assignment.count({ where: { status: "active" } });
    const totalDocuments = await Document.count();
    const totalShifts = await Shift.count();
    const totalBookings = await Booking.count();
    const activeBookings = await Booking.count({
      where: { status: { [Op.in]: ["pending", "approved", "checked_in"] } }
    });

    // Today's Attendance
    const todayAttendanceRecords = await Attendance.findAll({
      where: { date: todayStr },
      attributes: ["status"]
    });

    const attendanceStats = {
      marked: todayAttendanceRecords.length,
      present: todayAttendanceRecords.filter(r => r.status === "present").length,
      late: todayAttendanceRecords.filter(r => r.status === "late").length,
      absent: todayAttendanceRecords.filter(r => r.status === "absent").length
    };

    // Recent Personnel (last 5)
    const recentPersonnel = await Personnel.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5
    });

    // Active Shift Deployments (last 5)
    const activeDeployments = await Assignment.findAll({
      where: { status: "active" },
      include: [
        { model: Personnel, attributes: ["id", "firstName", "lastName", "employeeId", "department"] },
        { model: Shift, attributes: ["name", "startTime", "endTime"] }
      ],
      order: [["startDate", "DESC"]],
      limit: 5
    });

    // Recent Audit Logs (last 5)
    let recentLogs = [];
    if (req.user && req.user.role === "admin") {
      recentLogs = await AuditLog.findAll({
        include: [{ model: User, attributes: ["name", "role"] }],
        order: [["createdAt", "DESC"]],
        limit: 5
      });
    }

    // Recent Bookings (last 5)
    const recentBookings = await Booking.findAll({
      include: [{ model: Personnel, attributes: ["id", "firstName", "lastName", "employeeId"] }],
      order: [["bookingDate", "DESC"], ["createdAt", "DESC"]],
      limit: 5
    });

    res.render("dashboard", {
      title: "Dashboard - JailPersonnel",
      user: req.user,
      stats: {
        totalPersonnel,
        activePersonnel,
        totalAssignments,
        totalDocuments,
        totalShifts,
        totalBookings,
        activeBookings,
        attendance: attendanceStats
      },
      recentPersonnel,
      activeDeployments,
      recentBookings,
      recentLogs
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("dashboard", { title: "Dashboard", user: req.user });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.flash("error_msg", "Email and password are required");
      return res.redirect("/login");
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      req.flash("error_msg", "Invalid credentials");
      return res.redirect("/login");
    }

    if (!user.isActive) {
      req.flash("error_msg", "Your account has been deactivated. Contact an administrator.");
      return res.redirect("/login");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash("error_msg", "Invalid credentials");
      await createAuditLog(user.id, "LOGIN_ATTEMPT", "User", user.id, null, null, req, "failure");
      return res.redirect("/login");
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    await createAuditLog(user.id, "LOGIN", "User", user.id, null, null, req, "success");
    req.flash("success_msg", `Welcome back, ${user.name}!`);
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    req.flash("error_msg", "An error occurred during login");
    res.redirect("/login");
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;

    if (!name || !email || !password || !passwordConfirm) {
      req.flash("error_msg", "All fields are required");
      return res.redirect("/register");
    }

    if (password !== passwordConfirm) {
      req.flash("error_msg", "Passwords do not match");
      return res.redirect("/register");
    }

    if (password.length < 6) {
      req.flash("error_msg", "Password must be at least 6 characters");
      return res.redirect("/register");
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      req.flash("error_msg", "Email is already registered");
      return res.redirect("/register");
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role: "staff", isActive: true });

    await createAuditLog(user.id, "REGISTER", "User", user.id, null, { name, email }, req, "success");

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    req.flash("success_msg", "Registration successful! Welcome to JailPersonnel.");
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Register error:", err);
    req.flash("error_msg", "An error occurred during registration");
    res.redirect("/register");
  }
};

export const logoutUser = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : (req.session ? req.session.userId : null);
    if (userId) {
      await createAuditLog(userId, "LOGOUT", "User", userId, null, null, req, "success");
    }
    if (req.session) {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.redirect("/");
      });
    } else {
      res.clearCookie("connect.sid");
      return res.redirect("/");
    }
  } catch (err) {
    console.error("Logout error:", err);
    res.redirect("/");
  }
};
