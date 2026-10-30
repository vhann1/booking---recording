/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { User } from "../models/userModel.js";

export const ensureAuthenticated = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    const user = await User.findByPk(req.session.userId);
    if (!user || !user.isActive) {
      req.session.destroy();
      return res.redirect("/login");
    }
    req.user = user;
    res.locals.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: "Authentication error" });
  }
};

export const ensureRole = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.session.userId) {
      return res.redirect("/login");
    }

    try {
      const user = await User.findByPk(req.session.userId);
      if (!user || !user.isActive) {
        req.session.destroy();
        return res.redirect("/login");
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).render("error", {
          title: "Access Denied",
          error: "You do not have permission to access this resource",
          user
        });
      }

      req.user = user;
      res.locals.user = user;
      next();
    } catch (err) {
      console.error("Role check error:", err);
      res.status(500).json({ error: "Authorization error" });
    }
  };
};

export const guestOnly = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/dashboard");
  }
  next();
};
