/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import express from "express";
import {
  listShifts,
  createShiftPage,
  createShift,
  editShiftPage,
  updateShift,
  deleteShift
} from "../controllers/shiftController.js";
import { ensureAuthenticated, ensureRole } from "../middleware/auth.js";
import { auditLogMiddleware } from "../middleware/auditLog.js";

const router = express.Router();

router.use(ensureAuthenticated);
router.use(auditLogMiddleware);
router.use(ensureRole(["admin", "staff"]));

router.get("/", listShifts);
router.get("/create", createShiftPage);
router.post("/create", createShift);
router.get("/edit/:id", editShiftPage);
router.post("/edit/:id", updateShift);
router.post("/delete/:id", deleteShift);

export default router;

