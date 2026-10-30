/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { AuditLog, User } from "../models/associations.js";
import { Op } from "sequelize";

export const listAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;
    const { action, entityType, status } = req.query;

    const where = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (status) where.status = status;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "role"]
        }
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    const totalPages = Math.ceil(count / limit) || 1;

    res.render("auditLog/list", {
      title: "System Audit Logs",
      logs: rows,
      filters: { action, entityType, status },
      currentPage: page,
      totalPages,
      totalCount: count,
      user: req.user
    });
  } catch (err) {
    console.error("List audit logs error:", err);
    req.flash("error_msg", "Failed to load audit logs");
    res.redirect("/dashboard");
  }
};

