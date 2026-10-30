/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import express from "express";
import {
  listPersonnel,
  createPersonnelPage,
  createPersonnel,
  editPersonnelPage,
  updatePersonnel,
  viewPersonnel,
  deletePersonnel,
  getPersonnelStats
} from "../controllers/personnelController.js";
import { ensureAuthenticated, ensureRole } from "../middleware/auth.js";
import { auditLogMiddleware } from "../middleware/auditLog.js";

const router = express.Router();

router.use(ensureAuthenticated);
router.use(auditLogMiddleware);
router.use(ensureRole(["admin", "staff"]));

// Personnel routes
router.get("/", listPersonnel);
router.get("/create", createPersonnelPage);
router.post("/create", createPersonnel);
router.get("/edit/:id", editPersonnelPage);
router.post("/edit/:id", updatePersonnel);
router.get("/view/:id", viewPersonnel);
router.post("/delete/:id", deletePersonnel);
router.get("/stats", getPersonnelStats);

export default router;
