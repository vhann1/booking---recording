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

import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";
import { Personnel } from "./personnelModel.js";
import { Shift } from "./shiftModel.js";

export const Assignment = sequelize.define("Assignment", {
  personnelId: { type: DataTypes.INTEGER, allowNull: false },
  shiftId: { type: DataTypes.INTEGER, allowNull: false },
  department: { type: DataTypes.STRING, allowNull: false },
  zone: { type: DataTypes.STRING },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE },
  status: { type: DataTypes.ENUM("active", "completed", "cancelled"), defaultValue: "active" },
  notes: { type: DataTypes.TEXT },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

Assignment.belongsTo(Personnel, { foreignKey: "personnelId" });
Assignment.belongsTo(Shift, { foreignKey: "shiftId" });

export { sequelize };
