/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { Attendance, Personnel } from "../models/associations.js";
import { createAuditLog } from "../middleware/auditLog.js";
import { Op } from "sequelize";

// GET all attendance records
export const listAttendance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const { personnelId, date, status } = req.query;

    const where = {};
    if (personnelId) where.personnelId = personnelId;
    if (status) where.status = status;
    if (date) {
      where.date = date;
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [{ model: Personnel, attributes: ["id", "firstName", "lastName", "employeeId", "department"], required: false }],
      limit,
      offset,
      order: [["date", "DESC"], ["createdAt", "DESC"]]
    });

    const totalPages = Math.ceil(count / limit) || 1;
    const personnel = await Personnel.findAll({ order: [["firstName", "ASC"]] });

    res.render("attendance/list", {
      title: "Attendance Records",
      attendance: rows,
      personnel,
      filters: { personnelId, date, status },
      selectedPersonnelId: personnelId,
      currentPage: page,
      totalPages,
      user: req.user
    });
  } catch (err) {
    console.error("List attendance error:", err);
    req.flash("error_msg", "Failed to load attendance records");
    res.redirect("/dashboard");
  }
};

// GET mark attendance page
export const markAttendancePage = async (req, res) => {
  try {
    const personnel = await Personnel.findAll({ where: { status: "active" }, order: [["firstName", "ASC"]] });
    const todayStr = new Date().toISOString().split("T")[0];
    res.render("attendance/mark", {
      title: "Mark Attendance",
      personnel,
      todayStr,
      user: req.user
    });
  } catch (err) {
    console.error("Mark attendance page error:", err);
    req.flash("error_msg", "Failed to load attendance page");
    res.redirect("/dashboard");
  }
};

// POST mark attendance
export const markAttendance = async (req, res) => {
  try {
    const { personnelId, date, status, checkIn, checkOut, remarks } = req.body;

    if (!personnelId || !date || !status) {
      req.flash("error_msg", "Personnel, Date, and Status are required");
      return res.redirect("/attendance/mark");
    }

    const personnel = await Personnel.findByPk(personnelId);
    if (!personnel) {
      req.flash("error_msg", "Personnel not found");
      return res.redirect("/attendance/mark");
    }

    // Check if attendance already marked for this date
    const existingRecord = await Attendance.findOne({ where: { personnelId, date } });
    if (existingRecord) {
      req.flash("error_msg", `Attendance already recorded for ${personnel.firstName} ${personnel.lastName} on this date`);
      return res.redirect("/attendance/mark");
    }

    const attendance = await Attendance.create({
      personnelId: parseInt(personnelId),
      date,
      status,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      remarks: remarks || null
    });

    await createAuditLog(req.user.id, "CREATE", "Attendance", attendance.id, null, attendance.toJSON(), req);

    req.flash("success_msg", "Attendance marked successfully");
    res.redirect("/attendance");
  } catch (err) {
    console.error("Mark attendance error:", err);
    req.flash("error_msg", "Failed to mark attendance: " + err.message);
    res.redirect("/attendance/mark");
  }
};

// GET edit attendance page
export const editAttendancePage = async (req, res) => {
  try {
    const record = await Attendance.findByPk(req.params.id, {
      include: [{ model: Personnel, attributes: ["firstName", "lastName", "employeeId"] }]
    });

    if (!record) {
      req.flash("error_msg", "Attendance record not found");
      return res.redirect("/attendance");
    }

    res.render("attendance/edit", {
      title: "Edit Attendance Record",
      record,
      user: req.user
    });
  } catch (err) {
    console.error("Edit attendance page error:", err);
    req.flash("error_msg", "Failed to load attendance record");
    res.redirect("/attendance");
  }
};

// POST update attendance (supports both JSON API and HTML form)
export const updateAttendance = async (req, res) => {
  try {
    const { date, status, checkIn, checkOut, remarks } = req.body;
    const attendanceId = req.params.id;

    const attendance = await Attendance.findByPk(attendanceId);
    if (!attendance) {
      if (req.is("json") || req.xhr) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      req.flash("error_msg", "Attendance record not found");
      return res.redirect("/attendance");
    }

    const oldValues = attendance.toJSON();

    if (date) attendance.date = date;
    if (status) attendance.status = status;
    attendance.checkIn = checkIn || null;
    attendance.checkOut = checkOut || null;
    attendance.remarks = remarks || null;

    await attendance.save();

    await createAuditLog(req.user.id, "UPDATE", "Attendance", attendanceId, oldValues, attendance.toJSON(), req);

    if (req.is("json") || req.xhr) {
      return res.json({ success: true, message: "Attendance updated successfully" });
    }

    req.flash("success_msg", "Attendance record updated successfully");
    res.redirect("/attendance");
  } catch (err) {
    console.error("Update attendance error:", err);
    if (req.is("json") || req.xhr) {
      return res.status(500).json({ error: "Failed to update attendance" });
    }
    req.flash("error_msg", "Failed to update attendance record");
    res.redirect("/attendance");
  }
};

// DELETE attendance
export const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    const oldValues = attendance.toJSON();
    await attendance.destroy();

    await createAuditLog(req.user.id, "DELETE", "Attendance", req.params.id, oldValues, null, req);

    req.flash("success_msg", "Attendance record deleted");
    res.redirect("/attendance");
  } catch (err) {
    console.error("Delete attendance error:", err);
    req.flash("error_msg", "Failed to delete attendance");
    res.redirect("/attendance");
  }
};

// GET attendance report (JSON API)
export const getAttendanceReport = async (req, res) => {
  try {
    const { personnelId, startDate, endDate } = req.query;

    const where = {};
    if (personnelId) where.personnelId = personnelId;
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const records = await Attendance.findAll({
      where,
      include: [{ model: Personnel, attributes: ["firstName", "lastName", "designation"] }],
      order: [["date", "DESC"]]
    });

    const stats = {
      total: records.length,
      present: records.filter(r => r.status === "present").length,
      absent: records.filter(r => r.status === "absent").length,
      late: records.filter(r => r.status === "late").length,
      earlyLeave: records.filter(r => r.status === "early_leave").length,
      holiday: records.filter(r => r.status === "holiday").length
    };

    res.json({ records, stats });
  } catch (err) {
    console.error("Attendance report error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};

// GET attendance statistics
export const getAttendanceStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const todayRecords = await Attendance.findAll({
      where: { date: today },
      attributes: ["status"],
      raw: true
    });

    const stats = {
      marked: todayRecords.length,
      present: todayRecords.filter(r => r.status === "present").length,
      absent: todayRecords.filter(r => r.status === "absent").length,
      late: todayRecords.filter(r => r.status === "late").length
    };

    res.json(stats);
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};
