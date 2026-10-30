/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import express from "express";
import { listAuditLogs } from "../controllers/auditLogController.js";
import { ensureAuthenticated, ensureRole } from "../middleware/auth.js";

const router = express.Router();

router.use(ensureAuthenticated);
router.use(ensureRole(["admin"]));

router.get("/", listAuditLogs);

export default router;

