/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { Document, Personnel } from "../models/associations.js";
import { createAuditLog } from "../middleware/auditLog.js";
import fs from "fs";
import path from "path";
import { Op } from "sequelize";

// List all documents
export const listDocuments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;
    const { personnelId, documentType, status, search } = req.query;

    const where = {};
    if (personnelId) where.personnelId = personnelId;
    if (documentType) where.documentType = documentType;
    if (status) where.status = status;
    if (search) {
      where.documentName = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await Document.findAndCountAll({
      where,
      include: [
        {
          model: Personnel,
          attributes: ["id", "firstName", "lastName", "employeeId", "department"]
        }
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    const totalPages = Math.ceil(count / limit) || 1;
    const personnelList = await Personnel.findAll({
      attributes: ["id", "firstName", "lastName", "employeeId"],
      order: [["firstName", "ASC"]]
    });

    // Counts for summary cards
    const totalDocs = await Document.count();
    const validDocs = await Document.count({ where: { status: "valid" } });
    const expiredDocs = await Document.count({ where: { status: "expired" } });
    const pendingDocs = await Document.count({ where: { status: "pending" } });

    res.render("document/list", {
      title: "Document Management",
      documents: rows,
      personnelList,
      filters: { personnelId, documentType, status, search },
      stats: { totalDocs, validDocs, expiredDocs, pendingDocs },
      currentPage: page,
      totalPages,
      user: req.user
    });
  } catch (err) {
    console.error("List documents error:", err);
    req.flash("error_msg", "Failed to load documents");
    res.redirect("/dashboard");
  }
};

// GET upload page
export const uploadDocumentPage = async (req, res) => {
  try {
    const selectedPersonnelId = req.query.personnelId || "";
    const personnelList = await Personnel.findAll({
      where: { status: "active" },
      attributes: ["id", "firstName", "lastName", "employeeId", "department"],
      order: [["firstName", "ASC"]]
    });

    res.render("document/upload", {
      title: "Upload Document",
      personnelList,
      selectedPersonnelId,
      user: req.user
    });
  } catch (err) {
    console.error("Upload document page error:", err);
    req.flash("error_msg", "Failed to load upload page");
    res.redirect("/document");
  }
};

// POST upload document
export const uploadDocument = async (req, res) => {
  try {
    const { personnelId, documentType, documentName, issuedDate, expiryDate, status, remarks } = req.body;

    if (!req.file) {
      req.flash("error_msg", "Please select a file to upload");
      return res.redirect(`/document/upload${personnelId ? `?personnelId=${personnelId}` : ""}`);
    }

    if (!personnelId || !documentType || !documentName) {
      // Remove uploaded file if validation fails
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      req.flash("error_msg", "Personnel, Document Type, and Document Name are required");
      return res.redirect(`/document/upload${personnelId ? `?personnelId=${personnelId}` : ""}`);
    }

    const relativePath = `/uploads/documents/${req.file.filename}`;

    const doc = await Document.create({
      personnelId: parseInt(personnelId),
      documentType,
      documentName,
      fileName: req.file.originalname,
      filePath: relativePath,
      uploadedBy: req.user.id,
      issuedDate: issuedDate || null,
      expiryDate: expiryDate || null,
      status: status || "valid",
      remarks: remarks || null
    });

    await createAuditLog(req.user.id, "UPLOAD", "Document", doc.id, null, doc.toJSON(), req);

    req.flash("success_msg", "Document uploaded successfully");
    res.redirect(`/document`);
  } catch (err) {
    console.error("Upload document error:", err);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    req.flash("error_msg", "Failed to upload document: " + err.message);
    res.redirect("/document/upload");
  }
};

// GET download / view document
export const viewDocument = async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      req.flash("error_msg", "Document not found");
      return res.redirect("/document");
    }

    const filePath = path.join(process.cwd(), "public", doc.filePath);
    if (!fs.existsSync(filePath)) {
      req.flash("error_msg", "File not found on server storage");
      return res.redirect("/document");
    }

    res.download(filePath, doc.fileName);
  } catch (err) {
    console.error("View document error:", err);
    req.flash("error_msg", "Failed to retrieve document");
    res.redirect("/document");
  }
};

// DELETE document
export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      req.flash("error_msg", "Document not found");
      return res.redirect("/document");
    }

    const oldValues = doc.toJSON();
    const filePath = path.join(process.cwd(), "public", doc.filePath);

    await doc.destroy();

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn("Failed to delete physical file:", filePath, e.message);
      }
    }

    await createAuditLog(req.user.id, "DELETE", "Document", req.params.id, oldValues, null, req);

    req.flash("success_msg", "Document deleted successfully");
    const returnUrl = req.header("Referer") || "/document";
    res.redirect(returnUrl);
  } catch (err) {
    console.error("Delete document error:", err);
    req.flash("error_msg", "Failed to delete document");
    res.redirect("/document");
  }
};

// GET document statistics
export const getDocumentStats = async (req, res) => {
  try {
    const total = await Document.count();
    const valid = await Document.count({ where: { status: "valid" } });
    const expired = await Document.count({ where: { status: "expired" } });
    const pending = await Document.count({ where: { status: "pending" } });

    res.json({ total, valid, expired, pending });
  } catch (err) {
    console.error("Document stats error:", err);
    res.status(500).json({ error: "Failed to fetch document statistics" });
  }
};

