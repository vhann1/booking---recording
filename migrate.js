import { Sequelize } from "sequelize";
import { sequelize } from "./models/db.js";
import { User } from "./models/userModel.js";
import { Personnel } from "./models/personnelModel.js";
import { Assignment } from "./models/assignmentModel.js";
import { Attendance } from "./models/attendanceModel.js";
import { Document } from "./models/documentModel.js";
import { Shift } from "./models/shiftModel.js";
import { AuditLog } from "./models/auditLogModel.js";
import { Notification } from "./models/notificationModel.js";
import inquirer from "inquirer";

const rootSequelize = new Sequelize("mysql://root:@localhost:3306/");

const { createDb } = await inquirer.prompt([
  {
    type: "confirm",
    name: "createDb",
    message: "Database 'jailpersonnel' may not exist. Create it?",
    default: true,
  },
]);

if (createDb) {
  await rootSequelize.query("CREATE DATABASE IF NOT EXISTS jailpersonnel;");
  console.log("✅ Database created (if it did not exist)");
}

try {
  await sequelize.authenticate();
  console.log("✅ Connected to MySQL database!");
  await sequelize.sync({ force: true });
  console.log("✅ Tables created for all models!");
} catch (err) {
  console.error("❌ Migration failed:", err);
} finally {
  process.exit();
}