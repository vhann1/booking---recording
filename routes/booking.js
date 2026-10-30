/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import express from "express";
import {
  listBookings,
  createBookingPage,
  createBooking,
  viewBooking,
  editBookingPage,
  updateBooking,
  updateBookingStatus,
  deleteBooking,
  exportBookingsExcel,
  getBookingStats
} from "../controllers/bookingController.js";
import { ensureAuthenticated, ensureRole } from "../middleware/auth.js";
import { auditLogMiddleware } from "../middleware/auditLog.js";

const router = express.Router();

router.use(ensureAuthenticated);
router.use(auditLogMiddleware);
router.use(ensureRole(["admin", "staff"]));

router.get("/", listBookings);
router.get("/stats", getBookingStats);
router.get("/export/excel", exportBookingsExcel);
router.get("/create", createBookingPage);
router.post("/create", createBooking);
router.get("/view/:id", viewBooking);
router.get("/edit/:id", editBookingPage);
router.post("/edit/:id", updateBooking);
router.post("/status/:id", updateBookingStatus);
router.post("/delete/:id", deleteBooking);

export default router;

