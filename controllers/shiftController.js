/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { Shift, Assignment } from "../models/associations.js";
import { createAuditLog } from "../middleware/auditLog.js";

// List all shifts
export const listShifts = async (req, res) => {
  try {
    const shifts = await Shift.findAll({
      include: [
        {
          model: Assignment,
          attributes: ["id", "status"]
        }
      ],
      order: [["startTime", "ASC"]]
    });

    const shiftData = shifts.map(s => {
      const json = s.toJSON();
      json.activeAssignmentsCount = (json.Assignments || []).filter(a => a.status === "active").length;
      json.totalAssignmentsCount = (json.Assignments || []).length;
      return json;
    });

    res.render("shift/list", {
      title: "Shift Management",
      shifts: shiftData,
      user: req.user
    });
  } catch (err) {
    console.error("List shifts error:", err);
    req.flash("error_msg", "Failed to load shifts");
    res.redirect("/dashboard");
  }
};

// GET create shift page
export const createShiftPage = (req, res) => {
  res.render("shift/create", {
    title: "Create Shift",
    user: req.user
  });
};

// POST create shift
export const createShift = async (req, res) => {
  try {
    const { name, startTime, endTime, breakDuration, description, status } = req.body;

    if (!name || !startTime || !endTime) {
      req.flash("error_msg", "Shift Name, Start Time, and End Time are required");
      return res.redirect("/shift/create");
    }

    const existing = await Shift.findOne({ where: { name } });
    if (existing) {
      req.flash("error_msg", "A shift with this name already exists");
      return res.redirect("/shift/create");
    }

    const shift = await Shift.create({
      name,
      startTime,
      endTime,
      breakDuration: parseInt(breakDuration) || 60,
      description: description || null,
      status: status || "active"
    });

    await createAuditLog(req.user.id, "CREATE", "Shift", shift.id, null, shift.toJSON(), req);

    req.flash("success_msg", "Shift created successfully");
    res.redirect("/shift");
  } catch (err) {
    console.error("Create shift error:", err);
    req.flash("error_msg", "Failed to create shift: " + err.message);
    res.redirect("/shift/create");
  }
};

// GET edit shift page
export const editShiftPage = async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) {
      req.flash("error_msg", "Shift not found");
      return res.redirect("/shift");
    }

    res.render("shift/edit", {
      title: "Edit Shift",
      shift,
      user: req.user
    });
  } catch (err) {
    console.error("Edit shift page error:", err);
    req.flash("error_msg", "Failed to load shift");
    res.redirect("/shift");
  }
};

// POST update shift
export const updateShift = async (req, res) => {
  try {
    const { name, startTime, endTime, breakDuration, description, status } = req.body;

    const shift = await Shift.findByPk(req.params.id);
    if (!shift) {
      req.flash("error_msg", "Shift not found");
      return res.redirect("/shift");
    }

    const oldValues = shift.toJSON();

    shift.name = name;
    shift.startTime = startTime;
    shift.endTime = endTime;
    shift.breakDuration = parseInt(breakDuration) || 0;
    shift.description = description;
    shift.status = status;

    await shift.save();

    await createAuditLog(req.user.id, "UPDATE", "Shift", shift.id, oldValues, shift.toJSON(), req);

    req.flash("success_msg", "Shift updated successfully");
    res.redirect("/shift");
  } catch (err) {
    console.error("Update shift error:", err);
    req.flash("error_msg", "Failed to update shift");
    res.redirect("/shift");
  }
};

// POST delete shift
export const deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) {
      req.flash("error_msg", "Shift not found");
      return res.redirect("/shift");
    }

    const assignedCount = await Assignment.count({ where: { shiftId: req.params.id } });
    if (assignedCount > 0) {
      req.flash("error_msg", `Cannot delete shift: It is assigned to ${assignedCount} personnel assignments.`);
      return res.redirect("/shift");
    }

    const oldValues = shift.toJSON();
    await shift.destroy();

    await createAuditLog(req.user.id, "DELETE", "Shift", req.params.id, oldValues, null, req);

    req.flash("success_msg", "Shift deleted successfully");
    res.redirect("/shift");
  } catch (err) {
    console.error("Delete shift error:", err);
    req.flash("error_msg", "Failed to delete shift");
    res.redirect("/shift");
  }
};

