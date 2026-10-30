/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import express from "express";
import {
  homePage
} from "../controllers/homeController.js";
import {
  loginPage,
  registerPage,
  forgotPasswordPage,
  postForgotPassword,
  dashboardPage,
  loginUser,
  registerUser,
  logoutUser
} from "../controllers/authController.js";
import { ensureAuthenticated, guestOnly } from "../middleware/auth.js";
import { auditLogMiddleware } from "../middleware/auditLog.js";

import personnelRoutes from "./personnel.js";
import attendanceRoutes from "./attendance.js";
import assignmentRoutes from "./assignment.js";
import documentRoutes from "./document.js";
import shiftRoutes from "./shift.js";
import userRoutes from "./user.js";
import auditLogRoutes from "./auditLog.js";
import reportRoutes from "./report.js";
import bookingRoutes from "./booking.js";

const router = express.Router();

// Public routes
router.get("/", homePage);
router.get("/login", guestOnly, loginPage);
router.post("/login", loginUser);
router.get("/register", guestOnly, registerPage);
router.post("/register", registerUser);
router.get("/forgot-password", forgotPasswordPage);
router.post("/forgot-password", postForgotPassword);

// Protected Core routes
router.get("/dashboard", ensureAuthenticated, auditLogMiddleware, dashboardPage);
router.get("/logout", logoutUser);

// Operational Module routes
router.use("/personnel", personnelRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/assignment", assignmentRoutes);
router.use("/document", documentRoutes);
router.use("/shift", shiftRoutes);
router.use("/user", userRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/reports", reportRoutes);
router.use("/booking", bookingRoutes);

export default router;
