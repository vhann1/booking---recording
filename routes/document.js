/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import express from "express";
import {
  listDocuments,
  uploadDocumentPage,
  uploadDocument,
  viewDocument,
  deleteDocument,
  getDocumentStats
} from "../controllers/documentController.js";
import { ensureAuthenticated, ensureRole } from "../middleware/auth.js";
import { auditLogMiddleware } from "../middleware/auditLog.js";
import { documentUpload } from "../middleware/upload.js";

const router = express.Router();

router.use(ensureAuthenticated);
router.use(auditLogMiddleware);
router.use(ensureRole(["admin", "staff"]));

router.get("/", listDocuments);
router.get("/upload", uploadDocumentPage);
router.post("/upload", documentUpload.single("documentFile"), uploadDocument);
router.get("/view/:id", viewDocument);
router.post("/delete/:id", deleteDocument);
router.get("/stats", getDocumentStats);

export default router;

