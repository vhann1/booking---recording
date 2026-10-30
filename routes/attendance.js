/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import express from "express";
import {
  listAttendance,
  markAttendancePage,
  markAttendance,
  editAttendancePage,
  updateAttendance,
  deleteAttendance,
  getAttendanceReport,
  getAttendanceStats
} from "../controllers/attendanceController.js";
import { ensureAuthenticated, ensureRole } from "../middleware/auth.js";
import { auditLogMiddleware } from "../middleware/auditLog.js";

const router = express.Router();

router.use(ensureAuthenticated);
router.use(auditLogMiddleware);
router.use(ensureRole(["admin", "staff"]));

// Attendance routes
router.get("/", listAttendance);
router.get("/mark", markAttendancePage);
router.post("/mark", markAttendance);
router.get("/edit/:id", editAttendancePage);
router.post("/edit/:id", updateAttendance);
router.post("/update/:id", updateAttendance);
router.post("/delete/:id", deleteAttendance);
router.get("/report", getAttendanceReport);
router.get("/stats", getAttendanceStats);

export default router;
