/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { sequelize } from "./db.js";
import { User } from "./userModel.js";
import { Personnel } from "./personnelModel.js";
import { Assignment } from "./assignmentModel.js";
import { Attendance } from "./attendanceModel.js";
import { Document } from "./documentModel.js";
import { Shift } from "./shiftModel.js";
import { AuditLog } from "./auditLogModel.js";
import { Notification } from "./notificationModel.js";
import { Booking } from "./bookingModel.js";

// Associations
Personnel.hasMany(Assignment, { foreignKey: "personnelId", onDelete: "CASCADE" });
if (!Assignment.associations.Personnel) {
  Assignment.belongsTo(Personnel, { foreignKey: "personnelId" });
}

Personnel.hasMany(Attendance, { foreignKey: "personnelId", onDelete: "CASCADE" });
if (!Attendance.associations.Personnel) {
  Attendance.belongsTo(Personnel, { foreignKey: "personnelId" });
}

Personnel.hasMany(Document, { foreignKey: "personnelId", onDelete: "CASCADE" });
if (!Document.associations.Personnel) {
  Document.belongsTo(Personnel, { foreignKey: "personnelId" });
}

Personnel.hasMany(Booking, { foreignKey: "personnelId", onDelete: "SET NULL" });
if (!Booking.associations.Personnel) {
  Booking.belongsTo(Personnel, { foreignKey: "personnelId" });
}

Shift.hasMany(Assignment, { foreignKey: "shiftId" });
if (!Assignment.associations.Shift) {
  Assignment.belongsTo(Shift, { foreignKey: "shiftId" });
}

User.hasMany(AuditLog, { foreignKey: "userId" });
AuditLog.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Document, { foreignKey: "uploadedBy" });
Document.belongsTo(User, { foreignKey: "uploadedBy", as: "uploader" });

User.hasMany(Booking, { foreignKey: "createdBy" });
Booking.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

User.hasMany(Notification, { foreignKey: "userId" });
Notification.belongsTo(User, { foreignKey: "userId" });

// Ensure Booking table exists & seed default sample bookings if empty
(async () => {
  try {
    await Booking.sync();
    const count = await Booking.count();
    if (count === 0) {
      const firstOfficer = await Personnel.findOne();
      const officerId = firstOfficer ? firstOfficer.id : null;
      const todayStr = new Date().toISOString().split("T")[0];

      await Booking.bulkCreate([
        {
          bookingNumber: "BKG-2026-1001",
          subjectName: "Carlos Mendoza",
          subjectContact: "+63 917 555 0142",
          subjectIdNumber: "DET-2026-089",
          bookingType: "Inmate Intake",
          facilityZone: "Intake & Booking Desk A",
          bookingDate: todayStr,
          startTime: "08:30",
          endTime: "09:30",
          personnelId: officerId,
          priority: "high",
          status: "checked_in",
          purpose: "Initial detainee admission, biometric fingerprinting, and medical screening.",
          remarks: "All personal effects logged and sealed in Property Vault #14.",
          checkedInAt: new Date()
        },
        {
          bookingNumber: "BKG-2026-1002",
          subjectName: "Atty. Maria Clara Santos",
          subjectContact: "mc.santos@lawfirm.ph",
          subjectIdNumber: "IBP-78412",
          bookingType: "Legal Consultation",
          facilityZone: "Legal Conference Room 2",
          bookingDate: todayStr,
          startTime: "10:00",
          endTime: "11:00",
          personnelId: officerId,
          priority: "normal",
          status: "approved",
          purpose: "Privileged legal counsel visitation for pre-trial preparation.",
          remarks: "Valid IBP ID verified. Cleared for Visitation Wing B."
        },
        {
          bookingNumber: "BKG-2026-1003",
          subjectName: "Elena Dela Cruz",
          subjectContact: "+63 918 223 9011",
          subjectIdNumber: "GOV-ID-44192",
          bookingType: "Visitation",
          facilityZone: "Visitation Hall A - Booth 4",
          bookingDate: todayStr,
          startTime: "13:30",
          endTime: "14:30",
          personnelId: officerId,
          priority: "normal",
          status: "pending",
          purpose: "Scheduled family visitation slot for Cellblock B.",
          remarks: "Awaiting gate security clearance."
        },
        {
          bookingNumber: "BKG-2026-1004",
          subjectName: "RTC Branch 42 Escort Detail",
          subjectContact: "Clerk of Court - Br. 42",
          subjectIdNumber: "CRT-ORD-2026-312",
          bookingType: "Court Transport",
          facilityZone: "Armored Transport Van #2",
          bookingDate: todayStr,
          startTime: "14:00",
          endTime: "16:30",
          personnelId: officerId,
          priority: "urgent",
          status: "approved",
          purpose: "Scheduled arraignment escort to Regional Trial Court Branch 42.",
          remarks: "Two escort officers assigned with perimeter clearance."
        }
      ]);
    }
  } catch (err) {
    console.error("Booking table init warning:", err.message);
  }
})();

export {
  sequelize,
  User,
  Personnel,
  Assignment,
  Attendance,
  Document,
  Shift,
  AuditLog,
  Notification,
  Booking
};
