---
inclusion: auto
---

# JailPersonnel Project Development Guide

## Current State Assessment

### ✅ What's Working
- Basic Express.js server setup with XianFire framework
- Session management configured
- Handlebars (HBS) templating with custom `.xian` extension
- Tailwind CSS setup
- Basic authentication routes: Login, Register, Logout
- Database connection (MySQL/Sequelize)

### ❌ Critical Issues
1. **Database**: Using "booking" instead of "jailpersonnel"
2. **No Models**: Only User model exists; missing Personnel, Assignments, Documents, Attendance, Roles, Departments, Shifts
3. **No Controllers**: Missing handlers for personnel CRUD, assignments, documents, attendance, reports
4. **No API Endpoints**: All CRUD operations missing
5. **Authentication**: No proper session validation, no role-based access control
6. **Dashboard**: Empty placeholder - no statistics, charts, or actual data
7. **No Middleware**: Missing auth checks, role checks, audit logging
8. **Views**: Minimal views, missing forms and management interfaces
9. **No Error Handling**: Basic error responses
10. **No Validation**: Form/data validation missing

## Implementation Priority

### Phase 1: Foundation (Database & Auth)
1. Create proper database schema
2. Create all required models
3. Implement session validation middleware
4. Implement role-based access control
5. Add proper error handling

### Phase 2: Core CRUD Operations
1. Personnel management (Create, Read, Update, Delete)
2. Assignments management
3. Documents management
4. Attendance tracking

### Phase 3: Dashboard & Reports
1. Dashboard statistics
2. Reporting system
3. Notifications
4. Audit logging

### Phase 4: Advanced Features
1. Backup/Recovery
2. Notifications system
3. User management
4. Additional validations

## Technology Stack
- **Framework**: Express.js with XianFire
- **Database**: MySQL with Sequelize ORM
- **Templating**: Handlebars (.xian files)
- **Styling**: Tailwind CSS
- **Authentication**: bcrypt + express-session
- **Other**: multer (file uploads), inquirer (CLI)

## Key Files to Create/Modify
- Models: Personnel, Assignment, Document, Attendance, Role, Department, Shift, AuditLog
- Controllers: personnelController, assignmentController, documentController, attendanceController
- Routes: personnel, assignment, document, attendance
- Middleware: auth, roleCheck, auditLog
- Views: Management pages for each entity
