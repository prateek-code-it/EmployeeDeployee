# Construction Company Management System

A comprehensive web app for a construction contracting company to manage tenders/projects
(with sub-projects), employees, attendance, salary, bills & inventory, material stock,
machinery, purchasing, daily progress reports, and internal messaging — all under
role-based access (Admin / Supervisor / Employee).

## Roles
- **Super Admin** — platform-level; creates companies and their first Company Head; can see across all companies
- **Company Head** — runs one company (same powers Admin used to have), scoped to their own company's data only
- **Supervisor** — scoped to their assigned project(s) within their company; can mark attendance, add bills/material entries, log DPRs, raise purchase requests, post progress updates, and create employees directly
- **Employee** — view-only access to their own attendance & salary, plus chat

## Multi-Tenancy
The app supports multiple separate companies on one platform, each with fully isolated data
(employees, projects, bills, sites, materials, equipment, vendors, users). Company isolation is
enforced via a `company_id` column on core tables and checked in every controller. Super Admin
is the only role that can see across companies.

## Tech Stack
- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** JWT-based, role-based access control

## Project Structure

```
EmployeeDeployee/
├── backend/
│   ├── src/
│   │   ├── config/       # DB connection
│   │   ├── middleware/   # auth, role checks, project-access scoping, file uploads
│   │   ├── controllers/  # route logic (one per module)
│   │   ├── routes/       # API route definitions
│   │   └── server.js     # app entry point
│   ├── scripts/          # create-admin.js
│   └── uploads/          # bills/, chat/, attendance-sheets/, dpr-photos/
├── frontend/
│   ├── src/
│   │   ├── pages/        # one file per screen
│   │   ├── components/   # Sidebar, Layout, Modal, ProtectedRoute
│   │   ├── context/      # AuthContext
│   │   └── lib/          # api.js (axios client)
├── database/              # schema.sql + incremental migrations (add_*.sql)
└── README.md
```

## Modules

### Backend (fully built & tested — 18 modules)
- [x] Auth (login, JWT, password reset, role middleware)
- [x] Employees
- [x] Projects (self-referencing tender/sub-project tree) + Sites
- [x] Supervisor-project scoping (project_supervisors)
- [x] Bills & Inventory (with image upload)
- [x] Attendance (single + bulk marking, monthly summary)
- [x] Attendance Sheet Uploads (photo/PDF of physical register, per site per day)
- [x] Salary (monthly generation, Pending/Partial/Paid, payment history)
- [x] Employee Requests (Supervisor → Admin approval flow)
- [x] Audit trail
- [x] Messaging (group + 1-to-1 direct, image attachments)
- [x] Material (catalog, receipts, issues, stock calculation)
- [x] Machinery (equipment, fuel logs, maintenance, breakdowns)
- [x] Purchase (Vendors, Purchase Requests, Purchase Orders, GRN)
- [x] DPR - Daily Progress Report (with photo gallery)
- [x] User Management (Admin creates/manages login accounts, password resets)
- [x] Drawings/Documents (with revision history) + BOQ (Bill of Quantities)
- [x] Multi-tenancy: Companies module + company_id scoping across Employees, Projects, Sites, Materials, Equipment, Vendors, Users

### Frontend
- [x] Login / Forced password reset
- [x] Sidebar navigation shell (role-based links)
- [x] Employees page
- [x] Projects tree view
- [x] Bills & Inventory page (with photo upload/preview)
- [x] Attendance page (digital marking + physical sheet uploads)
- [x] Material page (stock/receipts/issues tabs)
- [x] Machinery page (equipment list + fuel/maintenance/breakdown logs)
- [x] Purchase page (Vendors/PR/PO/GRN)
- [x] Companies page (Super Admin)
- [x] Idle session timeout (30min auto-logout with warning)
- [x] DPR page (daily reports + photo gallery)
- [ ] Users page → wait, this one's done too
- [x] Salary page
- [x] Employee Requests page
- [ ] Messages (chat) page
- [x] Audit Log page
- [ ] Real Dashboard with summary stats

### Planned (not started)
- [ ] Drawings (BOQ, Specifications, Revisions)
- [ ] QA/QC (Cube Test, Inspection, Material Test, NCR)
- [ ] Safety (Incident, PPE, Toolbox Talk, Training)

## Backend Setup

1. Install dependencies:
```bash
   cd backend
   npm install
```

2. Configure environment:
```bash
   cp .env.example .env
   # edit .env with your real DB password and a generated JWT secret
```

3. Set up the database:
```bash
   psql -U app_user -d construction_app -f ../schema.sql
   # then run each database/add_*.sql migration in order
```

4. Create the initial Admin account:
```bash
   npm run create-admin
```

5. Start the server:
```bash
   npm start # run it in the backend directory
```

## Frontend Setup

1. Install dependencies:
```bash
   cd frontend
   npm install
```

2. Configure environment:
```bash
   cp .env.example .env   # set VITE_API_URL to your backend URL
```

3. Start the dev server:
```bash
   npm run dev # in the frontend directory
```

## Deployment Plan
- **Development:** local Ubuntu server (in a VirtualBox VM on Fedora, accessed via SSH tunnel/port-forward)
- **Production (planned):** Render or Railway (Node.js + managed PostgreSQL support)
- **Deployment:** Planned to deploy on online site to test the project 
