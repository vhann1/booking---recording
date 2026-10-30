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

import { AuditLog } from "../models/auditLogModel.js";

export const createAuditLog = async (userId, action, entityType, entityId, oldValues = null, newValues = null, req = null, status = "success") => {
  try {
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      ipAddress: req ? req.ip : null,
      userAgent: req ? req.get("user-agent") : null,
      status,
      remarks: null
    });
  } catch (err) {
    console.error("Audit log creation failed:", err);
  }
};

export const auditLogMiddleware = (req, res, next) => {
  res.createAuditLog = (action, entityType, entityId, oldValues, newValues, status = "success") => {
    if (req.user) {
      createAuditLog(req.user.id, action, entityType, entityId, oldValues, newValues, req, status);
    }
  };
  next();
};
