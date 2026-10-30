/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { Personnel, Assignment, Attendance, Shift, Document } from "../models/associations.js";
import { Op } from "sequelize";

// Helper to escape XML special characters
function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Helper to escape CSV values
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export const reportsPage = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const startDate = req.query.startDate || todayStr;
    const endDate = req.query.endDate || todayStr;
    const department = req.query.department || "";

    // 1. Attendance Report
    const attWhere = {
      date: {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      }
    };

    const attendanceRecords = await Attendance.findAll({
      where: attWhere,
      include: [
        {
          model: Personnel,
          where: department ? { department } : {},
          attributes: ["id", "employeeId", "firstName", "lastName", "department", "designation"]
        }
      ],
      order: [["date", "DESC"], ["createdAt", "DESC"]]
    });

    const attendanceStats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.status === "present").length,
      late: attendanceRecords.filter(r => r.status === "late").length,
      absent: attendanceRecords.filter(r => r.status === "absent").length,
      earlyLeave: attendanceRecords.filter(r => r.status === "early_leave").length,
      holiday: attendanceRecords.filter(r => r.status === "holiday").length
    };

    // 2. Department Breakdown
    const allPersonnel = await Personnel.findAll();
    const departmentMap = {};
    allPersonnel.forEach(p => {
      const dept = p.department || "Unassigned";
      if (!departmentMap[dept]) {
        departmentMap[dept] = { total: 0, active: 0, inactive: 0 };
      }
      departmentMap[dept].total++;
      if (p.status === "active") departmentMap[dept].active++;
      else departmentMap[dept].inactive++;
    });

    const departmentStats = Object.keys(departmentMap).map(k => ({
      name: k,
      ...departmentMap[k]
    }));

    // 3. Shift Coverage Overview
    const shifts = await Shift.findAll({
      include: [
        {
          model: Assignment,
          where: { status: "active" },
          required: false,
          include: [{ model: Personnel, attributes: ["firstName", "lastName"] }]
        }
      ]
    });

    const shiftCoverage = shifts.map(s => ({
      name: s.name,
      time: `${s.startTime} - ${s.endTime}`,
      activeOfficersCount: (s.Assignments || []).length,
      officers: (s.Assignments || []).map(a => `${a.Personnel.firstName} ${a.Personnel.lastName}`).join(", ")
    }));

    // Available departments for filter
    const departments = [...new Set(allPersonnel.map(p => p.department))].filter(Boolean);

    res.render("report/index", {
      title: "Facility Operational Reports",
      startDate,
      endDate,
      department,
      departments,
      attendanceRecords,
      attendanceStats,
      departmentStats,
      shiftCoverage,
      user: req.user
    });
  } catch (err) {
    console.error("Reports page error:", err);
    req.flash("error_msg", "Failed to load operational reports");
    res.redirect("/dashboard");
  }
};

// EXPORT ATTENDANCE AS NATIVE EXCEL (.XLS / SPREADSHEETML)
export const exportAttendanceExcel = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const startDate = req.query.startDate || todayStr;
    const endDate = req.query.endDate || todayStr;
    const department = req.query.department || "";

    const attWhere = {
      date: {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      }
    };

    const records = await Attendance.findAll({
      where: attWhere,
      include: [
        {
          model: Personnel,
          where: department ? { department } : {},
          attributes: ["employeeId", "firstName", "lastName", "department", "designation"]
        }
      ],
      order: [["date", "DESC"]]
    });

    const total = records.length;
    const present = records.filter(r => r.status === "present").length;
    const late = records.filter(r => r.status === "late").length;
    const absent = records.filter(r => r.status === "absent").length;

    // Generate XML Spreadsheet 2003 format (native Excel workbook)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Facility Attendance Report</Title>
  <Subject>Jail Personnel Management System</Subject>
  <Author>Jail Personnel System</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Segoe UI" ss:Size="16" ss:Bold="1" ss:Color="#1E3A8A"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubtitleStyle">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#64748B" ss:Italic="1"/>
  </Style>
  <Style ss:ID="HeaderRow">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1D4ED8"/>
   </Borders>
  </Style>
  <Style ss:ID="SummaryHeader">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="SummaryValue">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#2563EB"/>
   <Alignment ss:Horizontal="Center"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRow">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="StatusPresent">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#166534"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="StatusLate">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#9A3412"/>
   <Interior ss:Color="#FFEDD5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="StatusAbsent">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Attendance Log">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="90"/>
   <Column ss:Width="100"/>
   <Column ss:Width="140"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="90"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="180"/>

   <Row ss:Height="30">
    <Cell ss:MergeAcross="8" ss:StyleID="TitleStyle"><Data ss:Type="String">Jail Facility Attendance &amp; Rollcall Report</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="8" ss:StyleID="SubtitleStyle"><Data ss:Type="String">Generated: ${new Date().toLocaleString()} | Period: ${startDate} to ${endDate} ${department ? `| Dept: ${escapeXml(department)}` : ""}</Data></Cell>
   </Row>
   <Row ss:Height="10"></Row>

   <!-- Summary KPI Block -->
   <Row ss:Height="22">
    <Cell ss:StyleID="SummaryHeader"><Data ss:Type="String">Total Logged</Data></Cell>
    <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${total}</Data></Cell>
    <Cell ss:StyleID="SummaryHeader"><Data ss:Type="String">Present</Data></Cell>
    <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${present}</Data></Cell>
    <Cell ss:StyleID="SummaryHeader"><Data ss:Type="String">Late</Data></Cell>
    <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${late}</Data></Cell>
    <Cell ss:StyleID="SummaryHeader"><Data ss:Type="String">Absent</Data></Cell>
    <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${absent}</Data></Cell>
   </Row>
   <Row ss:Height="10"></Row>

   <!-- Table Header -->
   <Row ss:Height="24" ss:StyleID="HeaderRow">
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Employee ID</Data></Cell>
    <Cell><Data ss:Type="String">Officer Name</Data></Cell>
    <Cell><Data ss:Type="String">Designation</Data></Cell>
    <Cell><Data ss:Type="String">Department</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">Time In</Data></Cell>
    <Cell><Data ss:Type="String">Time Out</Data></Cell>
    <Cell><Data ss:Type="String">Remarks</Data></Cell>
   </Row>`;

    records.forEach(r => {
      const dateStr = r.date ? new Date(r.date).toISOString().split("T")[0] : "";
      const empId = r.Personnel ? r.Personnel.employeeId : "";
      const name = r.Personnel ? `${r.Personnel.firstName} ${r.Personnel.lastName}` : "Unknown";
      const desig = r.Personnel ? r.Personnel.designation : "";
      const dept = r.Personnel ? r.Personnel.department : "";
      const status = r.status || "";
      const checkIn = r.checkIn || "--";
      const checkOut = r.checkOut || "--";
      const remarks = r.remarks || "";

      let statusStyle = "DataRow";
      if (status === "present") statusStyle = "StatusPresent";
      else if (status === "late") statusStyle = "StatusLate";
      else if (status === "absent") statusStyle = "StatusAbsent";

      xml += `
   <Row ss:Height="20" ss:StyleID="DataRow">
    <Cell><Data ss:Type="String">${escapeXml(dateStr)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(empId)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(name)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(desig)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(dept)}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${escapeXml(status.toUpperCase())}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(checkIn)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(checkOut)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(remarks)}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const fileName = `Attendance_Report_${startDate}_to_${endDate}.xls`;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(xml);
  } catch (err) {
    console.error("Export Excel error:", err);
    req.flash("error_msg", "Failed to generate Excel export");
    res.redirect("/reports");
  }
};

// EXPORT ATTENDANCE AS CSV
export const exportAttendanceCsv = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const startDate = req.query.startDate || todayStr;
    const endDate = req.query.endDate || todayStr;
    const department = req.query.department || "";

    const attWhere = {
      date: {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      }
    };

    const records = await Attendance.findAll({
      where: attWhere,
      include: [
        {
          model: Personnel,
          where: department ? { department } : {},
          attributes: ["employeeId", "firstName", "lastName", "department", "designation"]
        }
      ],
      order: [["date", "DESC"]]
    });

    // UTF-8 BOM for Microsoft Excel auto-detect
    let csv = "\uFEFF";
    csv += "Date,Employee ID,Officer Name,Designation,Department,Status,Time In,Time Out,Remarks\r\n";

    records.forEach(r => {
      const dateStr = r.date ? new Date(r.date).toISOString().split("T")[0] : "";
      const empId = r.Personnel ? r.Personnel.employeeId : "";
      const name = r.Personnel ? `${r.Personnel.firstName} ${r.Personnel.lastName}` : "Unknown";
      const desig = r.Personnel ? r.Personnel.designation : "";
      const dept = r.Personnel ? r.Personnel.department : "";
      const status = r.status || "";
      const checkIn = r.checkIn || "";
      const checkOut = r.checkOut || "";
      const remarks = r.remarks || "";

      csv += [
        escapeCsv(dateStr),
        escapeCsv(empId),
        escapeCsv(name),
        escapeCsv(desig),
        escapeCsv(dept),
        escapeCsv(status),
        escapeCsv(checkIn),
        escapeCsv(checkOut),
        escapeCsv(remarks)
      ].join(",") + "\r\n";
    });

    const fileName = `Attendance_Report_${startDate}_to_${endDate}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(csv);
  } catch (err) {
    console.error("Export CSV error:", err);
    req.flash("error_msg", "Failed to generate CSV export");
    res.redirect("/reports");
  }
};

// EXPORT ROSTER AS EXCEL (.XLS)
export const exportRosterExcel = async (req, res) => {
  try {
    const personnel = await Personnel.findAll({
      order: [["department", "ASC"], ["firstName", "ASC"]]
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Facility Personnel Roster</Title>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Segoe UI" ss:Size="16" ss:Bold="1" ss:Color="#1E3A8A"/>
  </Style>
  <Style ss:ID="HeaderRow">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="DataRow">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Personnel Roster">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="100"/>
   <Column ss:Width="140"/>
   <Column ss:Width="160"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="90"/>
   <Column ss:Width="80"/>

   <Row ss:Height="30">
    <Cell ss:MergeAcross="7" ss:StyleID="TitleStyle"><Data ss:Type="String">Jail Facility Active Personnel Roster</Data></Cell>
   </Row>
   <Row ss:Height="24" ss:StyleID="HeaderRow">
    <Cell><Data ss:Type="String">Employee ID</Data></Cell>
    <Cell><Data ss:Type="String">Name</Data></Cell>
    <Cell><Data ss:Type="String">Email</Data></Cell>
    <Cell><Data ss:Type="String">Phone</Data></Cell>
    <Cell><Data ss:Type="String">Designation</Data></Cell>
    <Cell><Data ss:Type="String">Department</Data></Cell>
    <Cell><Data ss:Type="String">Joining Date</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>`;

    personnel.forEach(p => {
      const joinDate = p.dateOfJoining ? new Date(p.dateOfJoining).toISOString().split("T")[0] : "";
      xml += `
   <Row ss:Height="20" ss:StyleID="DataRow">
    <Cell><Data ss:Type="String">${escapeXml(p.employeeId)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.firstName + " " + p.lastName)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.email)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.phone || "--")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.designation)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.department)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(joinDate)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.status.toUpperCase())}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const fileName = `Personnel_Roster_${new Date().toISOString().split("T")[0]}.xls`;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(xml);
  } catch (err) {
    console.error("Export roster error:", err);
    req.flash("error_msg", "Failed to export roster");
    res.redirect("/reports");
  }
};
