/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { Personnel, Attendance, Assignment, Document, Shift } from "../models/associations.js";
import { createAuditLog } from "../middleware/auditLog.js";
import { Op } from "sequelize";

// GET all personnel with search & filter
export const listPersonnel = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { search, department, status } = req.query;

    const where = {};
    if (status) where.status = status;
    if (department) where.department = department;
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { employeeId: { [Op.like]: `%${search}%` } },
        { designation: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Personnel.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    const totalPages = Math.ceil(count / limit) || 1;

    // Distinct departments for filter dropdown
    const allPersonnel = await Personnel.findAll({ attributes: ["department"] });
    const departments = [...new Set(allPersonnel.map(p => p.department))].filter(Boolean);

    res.render("personnel/list", {
      title: "Personnel Management",
      personnel: rows,
      departments,
      filters: { search, department, status },
      currentPage: page,
      totalPages,
      user: req.user
    });
  } catch (err) {
    console.error("List personnel error:", err);
    req.flash("error_msg", "Failed to load personnel");
    res.redirect("/dashboard");
  }
};

// GET create form
export const createPersonnelPage = (req, res) => {
  res.render("personnel/create", { title: "Add Personnel", user: req.user });
};

// POST create personnel
export const createPersonnel = async (req, res) => {
  try {
    const { employeeId, firstName, lastName, email, phone, designation, department, dateOfJoining, address, dateOfBirth } = req.body;

    if (!employeeId || !firstName || !lastName || !email || !designation || !department || !dateOfJoining) {
      req.flash("error_msg", "Required fields missing");
      return res.redirect("/personnel/create");
    }

    const existingEmployee = await Personnel.findOne({ where: { employeeId } });
    if (existingEmployee) {
      req.flash("error_msg", "Employee ID already exists");
      return res.redirect("/personnel/create");
    }

    const existingEmail = await Personnel.findOne({ where: { email } });
    if (existingEmail) {
      req.flash("error_msg", "Email already exists");
      return res.redirect("/personnel/create");
    }

    const personnel = await Personnel.create({
      employeeId,
      firstName,
      lastName,
      email,
      phone: phone || null,
      designation,
      department,
      dateOfJoining,
      address: address || null,
      dateOfBirth: dateOfBirth || null
    });

    await createAuditLog(req.user.id, "CREATE", "Personnel", personnel.id, null, personnel.toJSON(), req);

    req.flash("success_msg", "Personnel added successfully");
    res.redirect("/personnel");
  } catch (err) {
    console.error("Create personnel error:", err);
    req.flash("error_msg", "Failed to create personnel: " + err.message);
    res.redirect("/personnel/create");
  }
};

// GET edit form
export const editPersonnelPage = async (req, res) => {
  try {
    const personnel = await Personnel.findByPk(req.params.id);
    if (!personnel) {
      req.flash("error_msg", "Personnel not found");
      return res.redirect("/personnel");
    }

    res.render("personnel/edit", {
      title: "Edit Personnel",
      personnel,
      user: req.user
    });
  } catch (err) {
    console.error("Edit page error:", err);
    req.flash("error_msg", "Failed to load personnel");
    res.redirect("/personnel");
  }
};

// POST update personnel
export const updatePersonnel = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, designation, department, dateOfJoining, status, address, dateOfBirth } = req.body;

    const personnel = await Personnel.findByPk(req.params.id);
    if (!personnel) {
      req.flash("error_msg", "Personnel not found");
      return res.redirect("/personnel");
    }

    const oldValues = personnel.toJSON();

    personnel.firstName = firstName;
    personnel.lastName = lastName;
    personnel.email = email;
    personnel.phone = phone || null;
    personnel.designation = designation;
    personnel.department = department;
    personnel.dateOfJoining = dateOfJoining;
    personnel.status = status;
    personnel.address = address || null;
    personnel.dateOfBirth = dateOfBirth || null;

    await personnel.save();

    await createAuditLog(req.user.id, "UPDATE", "Personnel", personnel.id, oldValues, personnel.toJSON(), req);

    req.flash("success_msg", "Personnel updated successfully");
    res.redirect(`/personnel/view/${personnel.id}`);
  } catch (err) {
    console.error("Update personnel error:", err);
    req.flash("error_msg", "Failed to update personnel");
    res.redirect("/personnel");
  }
};

// GET personnel details
export const viewPersonnel = async (req, res) => {
  try {
    const personnel = await Personnel.findByPk(req.params.id);
    if (!personnel) {
      req.flash("error_msg", "Personnel not found");
      return res.redirect("/personnel");
    }

    // Associated Attendance
    const attendanceStats = await Attendance.findAll({
      where: { personnelId: req.params.id },
      order: [["date", "DESC"]],
      limit: 15
    });

    // Associated Shift Assignments
    const assignments = await Assignment.findAll({
      where: { personnelId: req.params.id },
      include: [{ model: Shift, attributes: ["name", "startTime", "endTime"] }],
      order: [["startDate", "DESC"]]
    });

    // Associated Documents
    const documents = await Document.findAll({
      where: { personnelId: req.params.id },
      order: [["createdAt", "DESC"]]
    });

    res.render("personnel/view", {
      title: `${personnel.firstName} ${personnel.lastName} - Profile`,
      personnel,
      attendanceStats,
      assignments,
      documents,
      user: req.user
    });
  } catch (err) {
    console.error("View personnel error:", err);
    req.flash("error_msg", "Failed to load personnel details");
    res.redirect("/personnel");
  }
};

// DELETE personnel
export const deletePersonnel = async (req, res) => {
  try {
    const personnel = await Personnel.findByPk(req.params.id);
    if (!personnel) {
      req.flash("error_msg", "Personnel not found");
      return res.redirect("/personnel");
    }

    const oldValues = personnel.toJSON();
    await personnel.destroy();

    await createAuditLog(req.user.id, "DELETE", "Personnel", req.params.id, oldValues, null, req);

    req.flash("success_msg", "Personnel deleted successfully");
    res.redirect("/personnel");
  } catch (err) {
    console.error("Delete personnel error:", err);
    req.flash("error_msg", "Failed to delete personnel");
    res.redirect("/personnel");
  }
};

// GET personnel statistics
export const getPersonnelStats = async (req, res) => {
  try {
    const totalPersonnel = await Personnel.count();
    const activePersonnel = await Personnel.count({ where: { status: "active" } });
    const inactivePersonnel = await Personnel.count({ where: { status: "inactive" } });

    res.json({
      total: totalPersonnel,
      active: activePersonnel,
      inactive: inactivePersonnel
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};
