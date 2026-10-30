/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bookingNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    subjectName: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    subjectContact: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    subjectIdNumber: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bookingType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "Visitation"
    },
    facilityZone: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    bookingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    startTime: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    endTime: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    personnelId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM("normal", "high", "urgent"),
      defaultValue: "normal"
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "checked_in", "completed", "cancelled"),
      defaultValue: "pending"
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    checkedInAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    checkedOutAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: "bookings",
    timestamps: true
  }
);

