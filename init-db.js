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
import bcrypt from "bcrypt";

const rootSequelize = new Sequelize("mysql://root:@localhost:3306/");

try {
  console.log("🔄 Creating database...");
  await rootSequelize.query("CREATE DATABASE IF NOT EXISTS jailpersonnel;");
  console.log("✅ Database created (if it did not exist)");

  console.log("🔄 Syncing models...");
  await sequelize.authenticate();
  console.log("✅ Connected to MySQL database!");
  
  await sequelize.sync({ force: true });
  console.log("✅ Tables created for all models!");

  // Create default admin user
  console.log("🔄 Creating default admin user...");
  const adminExists = await User.findOne({ where: { email: "admin@jailpersonnel.com" } });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await User.create({
      name: "Admin User",
      email: "admin@jailpersonnel.com",
      password: hashedPassword,
      role: "admin",
      isActive: true
    });
    console.log("✅ Admin user created (admin@jailpersonnel.com / admin123)");
  }

  // Create some default shifts
  console.log("🔄 Creating default shifts...");
  const shiftsExist = await Shift.count();
  if (shiftsExist === 0) {
    await Shift.create({
      name: "Morning Shift",
      startTime: "06:00",
      endTime: "14:00",
      breakDuration: 60,
      description: "Morning shift from 6 AM to 2 PM"
    });
    await Shift.create({
      name: "Afternoon Shift",
      startTime: "14:00",
      endTime: "22:00",
      breakDuration: 60,
      description: "Afternoon shift from 2 PM to 10 PM"
    });
    await Shift.create({
      name: "Night Shift",
      startTime: "22:00",
      endTime: "06:00",
      breakDuration: 60,
      description: "Night shift from 10 PM to 6 AM"
    });
    console.log("✅ Default shifts created");
  }

  console.log("\n✅ Database initialization complete!");
  console.log("\n📋 Test Credentials:");
  console.log("   Email: admin@jailpersonnel.com");
  console.log("   Password: admin123");
  
} catch (err) {
  console.error("❌ Initialization failed:", err.message);
} finally {
  process.exit();
}
