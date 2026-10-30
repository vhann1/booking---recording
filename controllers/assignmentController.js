/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { Assignment, Personnel, Shift } from "../models/associations.js";
import { createAuditLog } from "../middleware/auditLog.js";
import { Op } from "sequelize";

// GET all assignments
export const listAssignments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;
    const { personnelId, shiftId, status, department } = req.query;

    const where = {};
    if (personnelId) where.personnelId = personnelId;
    if (shiftId) where.shiftId = shiftId;
    if (status) where.status = status;
    if (department) where.department = department;

    const { count, rows } = await Assignment.findAndCountAll({
      where,
      include: [
        { model: Personnel, attributes: ["id", "firstName", "lastName", "employeeId", "designation"] },
        { model: Shift, attributes: ["id", "name", "startTime", "endTime"] }
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    const totalPages = Math.ceil(count / limit) || 1;
    const personnel = await Personnel.findAll({ order: [["firstName", "ASC"]] });
    const shifts = await Shift.findAll({ order: [["startTime", "ASC"]] });

    res.render("assignment/list", {
      title: "Shift Assignments",
      assignments: rows,
      personnel,
      shifts,
      filters: { personnelId, shiftId, status, department },
      currentPage: page,
      totalPages,
      user: req.user
    });
  } catch (err) {
    console.error("List assignments error:", err);
    req.flash("error_msg", "Failed to load assignments");
    res.redirect("/dashboard");
  }
};

// GET create assignment page
export const createAssignmentPage = async (req, res) => {
  try {
    const personnel = await Personnel.findAll({ where: { status: "active" }, order: [["firstName", "ASC"]] });
    const shifts = await Shift.findAll({ where: { status: "active" }, order: [["startTime", "ASC"]] });
    const selectedPersonnelId = req.query.personnelId || "";

    res.render("assignment/create", {
      title: "Create Assignment",
      personnel,
      shifts,
      selectedPersonnelId,
      user: req.user
    });
  } catch (err) {
    console.error("Create page error:", err);
    req.flash("error_msg", "Failed to load assignment form");
    res.redirect("/assignment");
  }
};

// POST create assignment
export const createAssignment = async (req, res) => {
  try {
    const { personnelId, shiftId, department, zone, startDate, endDate, notes } = req.body;

    if (!personnelId || !shiftId || !department || !startDate) {
      req.flash("error_msg", "Personnel, Shift, Department, and Start Date are required");
      return res.redirect("/assignment/create");
    }

    const assignment = await Assignment.create({
      personnelId: parseInt(personnelId),
      shiftId: parseInt(shiftId),
      department,
      zone: zone || null,
      startDate,
      endDate: endDate || null,
      notes: notes || null
    });

    await createAuditLog(req.user.id, "CREATE", "Assignment", assignment.id, null, assignment.toJSON(), req);

    req.flash("success_msg", "Assignment created successfully");
    res.redirect("/assignment");
  } catch (err) {
    console.error("Create assignment error:", err);
    req.flash("error_msg", "Failed to create assignment: " + err.message);
    res.redirect("/assignment/create");
  }
};

// GET edit assignment page
export const editAssignmentPage = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) {
      req.flash("error_msg", "Assignment not found");
      return res.redirect("/assignment");
    }

    const personnel = await Personnel.findAll({ order: [["firstName", "ASC"]] });
    const shifts = await Shift.findAll({ order: [["startTime", "ASC"]] });

    res.render("assignment/edit", {
      title: "Edit Assignment",
      assignment,
      personnel,
      shifts,
      user: req.user
    });
  } catch (err) {
    console.error("Edit page error:", err);
    req.flash("error_msg", "Failed to load assignment");
    res.redirect("/assignment");
  }
};

// POST update assignment
export const updateAssignment = async (req, res) => {
  try {
    const { personnelId, shiftId, department, zone, startDate, endDate, status, notes } = req.body;

    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) {
      req.flash("error_msg", "Assignment not found");
      return res.redirect("/assignment");
    }

    const oldValues = assignment.toJSON();

    assignment.personnelId = parseInt(personnelId);
    assignment.shiftId = parseInt(shiftId);
    assignment.department = department;
    assignment.zone = zone || null;
    assignment.startDate = startDate;
    assignment.endDate = endDate || null;
    assignment.status = status;
    assignment.notes = notes || null;

    await assignment.save();

    await createAuditLog(req.user.id, "UPDATE", "Assignment", assignment.id, oldValues, assignment.toJSON(), req);

    req.flash("success_msg", "Assignment updated successfully");
    res.redirect("/assignment");
  } catch (err) {
    console.error("Update assignment error:", err);
    req.flash("error_msg", "Failed to update assignment");
    res.redirect("/assignment");
  }
};

// DELETE assignment
export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) {
      req.flash("error_msg", "Assignment not found");
      return res.redirect("/assignment");
    }

    const oldValues = assignment.toJSON();
    await assignment.destroy();

    await createAuditLog(req.user.id, "DELETE", "Assignment", req.params.id, oldValues, null, req);

    req.flash("success_msg", "Assignment deleted successfully");
    res.redirect("/assignment");
  } catch (err) {
    console.error("Delete assignment error:", err);
    req.flash("error_msg", "Failed to delete assignment");
    res.redirect("/assignment");
  }
};

// GET active assignments
export const getActiveAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.findAll({
      where: { status: "active" },
      include: [
        { model: Personnel, attributes: ["id", "firstName", "lastName", "employeeId"] },
        { model: Shift, attributes: ["id", "name", "startTime", "endTime"] }
      ]
    });

    res.json(assignments);
  } catch (err) {
    console.error("Get active assignments error:", err);
    res.status(500).json({ error: "Failed to fetch active assignments" });
  }
};
