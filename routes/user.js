/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import express from "express";
import {
  listUsers,
  editUserPage,
  updateUser,
  resetUserPassword,
  deleteUser
} from "../controllers/userController.js";
import { ensureAuthenticated, ensureRole } from "../middleware/auth.js";
import { auditLogMiddleware } from "../middleware/auditLog.js";

const router = express.Router();

router.use(ensureAuthenticated);
router.use(auditLogMiddleware);
router.use(ensureRole(["admin"])); // Only admin can access

router.get("/", listUsers);
router.get("/edit/:id", editUserPage);
router.post("/edit/:id", updateUser);
router.post("/reset-password/:id", resetUserPassword);
router.post("/delete/:id", deleteUser);

export default router;

