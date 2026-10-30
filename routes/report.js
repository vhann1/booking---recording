/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import express from "express";
import {
  reportsPage,
  exportAttendanceExcel,
  exportAttendanceCsv,
  exportRosterExcel
} from "../controllers/reportController.js";
import { ensureAuthenticated, ensureRole } from "../middleware/auth.js";
import { auditLogMiddleware } from "../middleware/auditLog.js";

const router = express.Router();

router.use(ensureAuthenticated);
router.use(auditLogMiddleware);
router.use(ensureRole(["admin", "staff"]));

router.get("/", reportsPage);
router.get("/export/excel", exportAttendanceExcel);
router.get("/export/csv", exportAttendanceCsv);
router.get("/export/roster-excel", exportRosterExcel);

export default router;
