/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import express from "express";
import path from "path";
import session from "express-session";
import flash from "connect-flash";
import router from "./routes/index.js";
import fs from "fs";
import hbs from "hbs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname } from "path";
import { auditLogMiddleware } from "./middleware/auditLog.js";
import "./models/associations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

app.use(
  session({
    secret: "xianfire-secret-key",
    resave: false,
    saveUninitialized: false
  })
);
app.use(flash());
app.use(auditLogMiddleware);

// Helper to register partials from views/partials
function registerAllPartials() {
  const partialsDir = path.join(__dirname, "views/partials");
  if (fs.existsSync(partialsDir)) {
    const files = fs.readdirSync(partialsDir);
    files
      .filter((file) => file.endsWith(".xian"))
      .forEach((file) => {
        const partialName = file.replace(".xian", "");
        const fullPath = path.join(partialsDir, file);
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          hbs.registerPartial(partialName, content);
          hbs.registerPartial(`partials/${partialName}`, content);
        } catch (err) {
          console.error(`❌ Failed to read partial: ${file}`, err);
        }
      });
  }
}

// Custom view engine with Handlebars
app.engine("xian", async (filePath, options, callback) => {
  try {
    registerAllPartials();
    const originalPartialsDir = hbs.partialsDir;
    hbs.partialsDir = path.join(__dirname, "views");

    const result = await new Promise((resolve, reject) => {
      hbs.__express(filePath, options, (err, html) => {
        if (err) return reject(err);
        resolve(html);
      });
    });

    hbs.partialsDir = originalPartialsDir;
    callback(null, result);
  } catch (err) {
    callback(err);
  }
});

app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  if (req.session && req.session.userId) {
    res.locals.user = {
      id: req.session.userId,
      name: req.session.userName,
      role: req.session.userRole
    };
  }
  next();
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");

// Register Handlebars helpers
hbs.registerHelper("eq", function (a, b) {
  return a === b;
});
hbs.registerHelper("ne", function (a, b) {
  return a !== b;
});
hbs.registerHelper("gt", function (a, b) {
  return a > b;
});
hbs.registerHelper("lt", function (a, b) {
  return a < b;
});
hbs.registerHelper("add", function (a, b) {
  return parseInt(a) + parseInt(b);
});
hbs.registerHelper("subtract", function (a, b) {
  return parseInt(a) - parseInt(b);
});
hbs.registerHelper("or", function (a, b) {
  return a || b;
});
hbs.registerHelper("and", function (a, b) {
  return a && b;
});
hbs.registerHelper("json", function (val) {
  return JSON.stringify(val);
});

hbs.registerHelper("formatDate", function (date, format) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  if (format === "input") {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
});

hbs.registerHelper("formatTime", function (time) {
  if (!time) return "--:--";
  const s = String(time);
  if (s.includes("T")) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
  }
  return s.slice(0, 5);
});

hbs.registerHelper("includes", function (arr, val) {
  if (!Array.isArray(arr)) return false;
  return arr.includes(val);
});

// Register partials from views/partials
const partialsDir = path.join(__dirname, "views/partials");
if (fs.existsSync(partialsDir)) {
  const files = fs.readdirSync(partialsDir);
  files
    .filter((file) => file.endsWith(".xian"))
    .forEach((file) => {
      const partialName = file.replace(".xian", "");
      const fullPath = path.join(partialsDir, file);
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        hbs.registerPartial(partialName, content);
        hbs.registerPartial(`partials/${partialName}`, content);
      } catch (err) {
        console.error(`❌ Failed to read partial: ${file}`, err);
      }
    });
}

app.use("/", router);

// 404 handler
app.use((req, res) => {
  res.status(404).render("error", {
    title: "404 - Not Found",
    error: "The page or resource you requested could not be found."
  });
});

// 500 error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).render("error", {
    title: "500 - Server Error",
    error: err.message || "An unexpected internal server error occurred."
  });
});

export default app;

// Start the HTTP server
export const startServer = (port = PORT) => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`🔥 XianFire JailPersonnel running at http://localhost:${port}`);
      resolve(server);
    });
    server.on("error", reject);
  });
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun && !process.env.XIAN_ELECTRON) {
  startServer();
}
