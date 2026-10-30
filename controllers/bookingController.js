/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { Booking, Personnel } from "../models/associations.js";
import { createAuditLog } from "../middleware/auditLog.js";
import { Op } from "sequelize";

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// GET /booking - List all bookings with search, filters, and KPI stats
export const listBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const bookingType = req.query.bookingType || "";
    const status = req.query.status || "";
    const bookingDate = req.query.bookingDate || "";
    const personnelId = req.query.personnelId || "";

    const where = {};

    if (search) {
      where[Op.or] = [
        { bookingNumber: { [Op.like]: `%${search}%` } },
        { subjectName: { [Op.like]: `%${search}%` } },
        { subjectIdNumber: { [Op.like]: `%${search}%` } },
        { facilityZone: { [Op.like]: `%${search}%` } }
      ];
    }

    if (bookingType) where.bookingType = bookingType;
    if (status) where.status = status;
    if (bookingDate) where.bookingDate = bookingDate;
    if (personnelId) where.personnelId = personnelId;

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include: [
        {
          model: Personnel,
          attributes: ["id", "employeeId", "firstName", "lastName", "designation", "department"]
        }
      ],
      order: [
        ["bookingDate", "DESC"],
        ["startTime", "ASC"],
        ["createdAt", "DESC"]
      ],
      limit,
      offset
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const [totalBookings, todayBookings, pendingBookings, activeBookings, completedBookings, personnelList] =
      await Promise.all([
        Booking.count(),
        Booking.count({ where: { bookingDate: todayStr } }),
        Booking.count({ where: { status: "pending" } }),
        Booking.count({ where: { status: { [Op.in]: ["approved", "checked_in"] } } }),
        Booking.count({ where: { status: "completed" } }),
        Personnel.findAll({
          where: { status: "active" },
          order: [["firstName", "ASC"]]
        })
      ]);

    const totalPages = Math.max(1, Math.ceil(count / limit));

    res.render("booking/list", {
      title: "Facility Booking Management",
      bookings,
      personnelList,
      currentPage: page,
      totalPages,
      stats: {
        total: totalBookings,
        today: todayBookings,
        pending: pendingBookings,
        active: activeBookings,
        completed: completedBookings
      },
      filters: {
        search,
        bookingType,
        status,
        bookingDate,
        personnelId
      },
      user: req.user
    });
  } catch (err) {
    console.error("List bookings error:", err);
    req.flash("error_msg", "Failed to load facility bookings");
    res.redirect("/dashboard");
  }
};

// GET /booking/create - Render create booking form
export const createBookingPage = async (req, res) => {
  try {
    const personnel = await Personnel.findAll({
      where: { status: "active" },
      order: [["firstName", "ASC"]]
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const suggestedBookingNumber = `BKG-${new Date().getFullYear()}-${randomSuffix}`;

    res.render("booking/create", {
      title: "Create New Booking",
      personnel,
      todayStr,
      suggestedBookingNumber,
      selectedPersonnelId: req.query.personnelId || "",
      user: req.user
    });
  } catch (err) {
    console.error("Create booking page error:", err);
    req.flash("error_msg", "Failed to load booking creation form");
    res.redirect("/booking");
  }
};

// POST /booking/create - Store new booking
export const createBooking = async (req, res) => {
  try {
    const {
      bookingNumber,
      subjectName,
      subjectContact,
      subjectIdNumber,
      bookingType,
      facilityZone,
      bookingDate,
      startTime,
      endTime,
      personnelId,
      priority,
      status,
      purpose,
      remarks
    } = req.body;

    if (!subjectName || !bookingType || !facilityZone || !bookingDate || !startTime) {
      req.flash("error_msg", "Please fill in all required booking fields");
      return res.redirect("/booking/create");
    }

    const finalBookingNumber =
      (bookingNumber && bookingNumber.trim()) ||
      `BKG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const existing = await Booking.findOne({ where: { bookingNumber: finalBookingNumber } });
    if (existing) {
      req.flash("error_msg", `Booking number ${finalBookingNumber} already exists`);
      return res.redirect("/booking/create");
    }

    const booking = await Booking.create({
      bookingNumber: finalBookingNumber,
      subjectName: subjectName.trim(),
      subjectContact: subjectContact ? subjectContact.trim() : null,
      subjectIdNumber: subjectIdNumber ? subjectIdNumber.trim() : null,
      bookingType,
      facilityZone: facilityZone.trim(),
      bookingDate,
      startTime,
      endTime: endTime || null,
      personnelId: personnelId ? parseInt(personnelId) : null,
      priority: priority || "normal",
      status: status || "pending",
      purpose: purpose || null,
      remarks: remarks || null,
      checkedInAt: status === "checked_in" ? new Date() : null,
      createdBy: req.user ? req.user.id : null
    });

    await createAuditLog(
      req.user ? req.user.id : null,
      "CREATE",
      "Booking",
      booking.id,
      null,
      booking.toJSON(),
      req
    );

    req.flash("success_msg", `Booking ${booking.bookingNumber} created successfully`);
    res.redirect("/booking");
  } catch (err) {
    console.error("Create booking error:", err);
    req.flash("error_msg", "Failed to create booking: " + err.message);
    res.redirect("/booking/create");
  }
};

// GET /booking/view/:id - View booking details & printable pass
export const viewBooking = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: Personnel,
          attributes: ["id", "employeeId", "firstName", "lastName", "designation", "department", "phone", "email"]
        }
      ]
    });

    if (!booking) {
      req.flash("error_msg", "Booking record not found");
      return res.redirect("/booking");
    }

    res.render("booking/view", {
      title: `Booking ${booking.bookingNumber}`,
      booking,
      user: req.user
    });
  } catch (err) {
    console.error("View booking error:", err);
    req.flash("error_msg", "Failed to load booking details");
    res.redirect("/booking");
  }
};

// GET /booking/edit/:id - Render edit booking form
export const editBookingPage = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      req.flash("error_msg", "Booking record not found");
      return res.redirect("/booking");
    }

    const personnel = await Personnel.findAll({
      where: { status: "active" },
      order: [["firstName", "ASC"]]
    });

    res.render("booking/edit", {
      title: `Edit Booking ${booking.bookingNumber}`,
      booking,
      personnel,
      user: req.user
    });
  } catch (err) {
    console.error("Edit booking page error:", err);
    req.flash("error_msg", "Failed to load booking edit page");
    res.redirect("/booking");
  }
};

// POST /booking/edit/:id - Update booking details
export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      req.flash("error_msg", "Booking record not found");
      return res.redirect("/booking");
    }

    const oldData = booking.toJSON();
    const {
      subjectName,
      subjectContact,
      subjectIdNumber,
      bookingType,
      facilityZone,
      bookingDate,
      startTime,
      endTime,
      personnelId,
      priority,
      status,
      purpose,
      remarks
    } = req.body;

    let checkedInAt = booking.checkedInAt;
    let checkedOutAt = booking.checkedOutAt;

    if (status === "checked_in" && !checkedInAt) {
      checkedInAt = new Date();
    }
    if (status === "completed" && !checkedOutAt) {
      checkedOutAt = new Date();
    }

    await booking.update({
      subjectName: subjectName ? subjectName.trim() : booking.subjectName,
      subjectContact: subjectContact ? subjectContact.trim() : null,
      subjectIdNumber: subjectIdNumber ? subjectIdNumber.trim() : null,
      bookingType: bookingType || booking.bookingType,
      facilityZone: facilityZone ? facilityZone.trim() : booking.facilityZone,
      bookingDate: bookingDate || booking.bookingDate,
      startTime: startTime || booking.startTime,
      endTime: endTime || null,
      personnelId: personnelId ? parseInt(personnelId) : null,
      priority: priority || booking.priority,
      status: status || booking.status,
      purpose: purpose || null,
      remarks: remarks || null,
      checkedInAt,
      checkedOutAt
    });

    await createAuditLog(
      req.user ? req.user.id : null,
      "UPDATE",
      "Booking",
      booking.id,
      oldData,
      booking.toJSON(),
      req
    );

    req.flash("success_msg", `Booking ${booking.bookingNumber} updated successfully`);
    res.redirect(`/booking/view/${booking.id}`);
  } catch (err) {
    console.error("Update booking error:", err);
    req.flash("error_msg", "Failed to update booking: " + err.message);
    res.redirect(`/booking/edit/${req.params.id}`);
  }
};

// POST /booking/status/:id - Quick status transition (Approve, Check-In, Complete, Cancel)
export const updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      req.flash("error_msg", "Booking record not found");
      return res.redirect("/booking");
    }

    const oldData = booking.toJSON();
    const { status } = req.body;
    const validStatuses = ["pending", "approved", "checked_in", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      req.flash("error_msg", "Invalid booking status");
      return res.redirect("/booking");
    }

    const updates = { status };
    if (status === "checked_in" && !booking.checkedInAt) {
      updates.checkedInAt = new Date();
    }
    if (status === "completed" && !booking.checkedOutAt) {
      updates.checkedOutAt = new Date();
    }

    await booking.update(updates);

    await createAuditLog(
      req.user ? req.user.id : null,
      "UPDATE",
      "Booking",
      booking.id,
      oldData,
      booking.toJSON(),
      req
    );

    req.flash("success_msg", `Booking ${booking.bookingNumber} marked as ${status.replace("_", " ").toUpperCase()}`);
    const referer = req.get("Referer") || "/booking";
    res.redirect(referer);
  } catch (err) {
    console.error("Update booking status error:", err);
    req.flash("error_msg", "Failed to update booking status");
    res.redirect("/booking");
  }
};

// POST /booking/delete/:id - Delete booking
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      req.flash("error_msg", "Booking record not found");
      return res.redirect("/booking");
    }

    const oldData = booking.toJSON();
    const bookingNum = booking.bookingNumber;
    await booking.destroy();

    await createAuditLog(
      req.user ? req.user.id : null,
      "DELETE",
      "Booking",
      req.params.id,
      oldData,
      null,
      req
    );

    req.flash("success_msg", `Booking ${bookingNum} removed from system`);
    res.redirect("/booking");
  } catch (err) {
    console.error("Delete booking error:", err);
    req.flash("error_msg", "Failed to delete booking");
    res.redirect("/booking");
  }
};

// GET /booking/export/excel - Export Bookings to Native Excel (.xls)
export const exportBookingsExcel = async (req, res) => {
  try {
    const bookingType = req.query.bookingType || "";
    const status = req.query.status || "";
    const bookingDate = req.query.bookingDate || "";

    const where = {};
    if (bookingType) where.bookingType = bookingType;
    if (status) where.status = status;
    if (bookingDate) where.bookingDate = bookingDate;

    const bookings = await Booking.findAll({
      where,
      include: [
        {
          model: Personnel,
          attributes: ["employeeId", "firstName", "lastName", "department"]
        }
      ],
      order: [
        ["bookingDate", "DESC"],
        ["startTime", "ASC"]
      ]
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Facility Bookings Report</Title>
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
   <Interior ss:Color="#1D4ED8" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="DataRow">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBEAFE"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Facility Bookings">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="110"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="140"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>
   <Column ss:Width="140"/>
   <Column ss:Width="140"/>
   <Column ss:Width="80"/>
   <Column ss:Width="90"/>
   <Column ss:Width="180"/>

   <Row ss:Height="30">
    <Cell ss:MergeAcross="10" ss:StyleID="TitleStyle"><Data ss:Type="String">Jail Facility Booking &amp; Reservation Log</Data></Cell>
   </Row>
   <Row ss:Height="24" ss:StyleID="HeaderRow">
    <Cell><Data ss:Type="String">Booking Ref</Data></Cell>
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Time Slot</Data></Cell>
    <Cell><Data ss:Type="String">Subject / Visitor</Data></Cell>
    <Cell><Data ss:Type="String">ID / Case No.</Data></Cell>
    <Cell><Data ss:Type="String">Booking Type</Data></Cell>
    <Cell><Data ss:Type="String">Facility Zone</Data></Cell>
    <Cell><Data ss:Type="String">Duty Officer</Data></Cell>
    <Cell><Data ss:Type="String">Priority</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">Purpose / Remarks</Data></Cell>
   </Row>`;

    bookings.forEach(b => {
      const officer = b.Personnel ? `${b.Personnel.firstName} ${b.Personnel.lastName} (${b.Personnel.employeeId})` : "Unassigned";
      const timeSlot = `${b.startTime}${b.endTime ? " - " + b.endTime : ""}`;
      xml += `
   <Row ss:Height="20" ss:StyleID="DataRow">
    <Cell><Data ss:Type="String">${escapeXml(b.bookingNumber)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(b.bookingDate)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(timeSlot)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(b.subjectName)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(b.subjectIdNumber || "--")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(b.bookingType)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(b.facilityZone)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(officer)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml((b.priority || "normal").toUpperCase())}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml((b.status || "pending").toUpperCase())}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(b.purpose || b.remarks || "--")}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const fileName = `Facility_Bookings_${new Date().toISOString().split("T")[0]}.xls`;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(xml);
  } catch (err) {
    console.error("Export bookings excel error:", err);
    req.flash("error_msg", "Failed to export bookings to Excel");
    res.redirect("/booking");
  }
};

// GET /booking/stats - JSON stats endpoint
export const getBookingStats = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const [total, today, pending, active, completed] = await Promise.all([
      Booking.count(),
      Booking.count({ where: { bookingDate: todayStr } }),
      Booking.count({ where: { status: "pending" } }),
      Booking.count({ where: { status: { [Op.in]: ["approved", "checked_in"] } } }),
      Booking.count({ where: { status: "completed" } })
    ]);
    res.json({ total, today, pending, active, completed });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch booking stats" });
  }
};

