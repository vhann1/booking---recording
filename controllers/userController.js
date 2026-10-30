/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { User } from "../models/associations.js";
import { createAuditLog } from "../middleware/auditLog.js";
import bcrypt from "bcrypt";

// List all users
export const listUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      order: [["createdAt", "DESC"]]
    });

    res.render("user/list", {
      title: "User Management",
      users,
      user: req.user
    });
  } catch (err) {
    console.error("List users error:", err);
    req.flash("error_msg", "Failed to load users");
    res.redirect("/dashboard");
  }
};

// GET edit user page
export const editUserPage = async (req, res) => {
  try {
    const targetUser = await User.findByPk(req.params.id);
    if (!targetUser) {
      req.flash("error_msg", "User not found");
      return res.redirect("/user");
    }

    res.render("user/edit", {
      title: `Edit User: ${targetUser.name}`,
      targetUser,
      user: req.user
    });
  } catch (err) {
    console.error("Edit user page error:", err);
    req.flash("error_msg", "Failed to load user");
    res.redirect("/user");
  }
};

// POST update user
export const updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const targetUser = await User.findByPk(req.params.id);

    if (!targetUser) {
      req.flash("error_msg", "User not found");
      return res.redirect("/user");
    }

    const oldValues = targetUser.toJSON();

    targetUser.name = name;
    targetUser.email = email;
    targetUser.role = role;
    targetUser.isActive = isActive === "true" || isActive === true;

    await targetUser.save();

    await createAuditLog(req.user.id, "UPDATE", "User", targetUser.id, oldValues, targetUser.toJSON(), req);

    req.flash("success_msg", "User updated successfully");
    res.redirect("/user");
  } catch (err) {
    console.error("Update user error:", err);
    req.flash("error_msg", "Failed to update user");
    res.redirect("/user");
  }
};

// POST reset password
export const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const targetUser = await User.findByPk(req.params.id);

    if (!targetUser) {
      req.flash("error_msg", "User not found");
      return res.redirect("/user");
    }

    if (!newPassword || newPassword.length < 6) {
      req.flash("error_msg", "Password must be at least 6 characters");
      return res.redirect(`/user/edit/${targetUser.id}`);
    }

    targetUser.password = await bcrypt.hash(newPassword, 10);
    await targetUser.save();

    await createAuditLog(req.user.id, "PASSWORD_RESET", "User", targetUser.id, null, null, req);

    req.flash("success_msg", `Password reset successfully for ${targetUser.name}`);
    res.redirect("/user");
  } catch (err) {
    console.error("Reset password error:", err);
    req.flash("error_msg", "Failed to reset password");
    res.redirect("/user");
  }
};

// POST delete user
export const deleteUser = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      req.flash("error_msg", "You cannot delete your own account");
      return res.redirect("/user");
    }

    const targetUser = await User.findByPk(req.params.id);
    if (!targetUser) {
      req.flash("error_msg", "User not found");
      return res.redirect("/user");
    }

    const oldValues = targetUser.toJSON();
    await targetUser.destroy();

    await createAuditLog(req.user.id, "DELETE", "User", req.params.id, oldValues, null, req);

    req.flash("success_msg", "User deleted successfully");
    res.redirect("/user");
  } catch (err) {
    console.error("Delete user error:", err);
    req.flash("error_msg", "Failed to delete user");
    res.redirect("/user");
  }
};

