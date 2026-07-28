# Construction Company Management System

A web app for a construction contracting company to manage employees, attendance,
salaries, projects/sub-projects (tenders), sites, bills & inventory, and internal
messaging — all under an Admin-controlled system with role-based access.

## Roles
- **Admin** — full control over everything
- **Supervisor** — scoped to their assigned project(s); can mark attendance, add bills,
  post progress updates, and request new employees (pending Admin approval)
- **Employee** — view-only access to their own attendance & salary, plus chat

## Tech Stack
- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** JWT-based, role-based access control

## Project Structure
EmployeeDeployee/
├── backend/ # Node.js + Express API
│ ├── src/
│ │ ├── config/ # DB connection
│ │ ├── middleware/ # auth (JWT verification, role checks)
│ │ ├── controllers/ # route logic
│ │ ├── routes/ # API route definitions
│ │ └── server.js # app entry point
│ ├── scripts/ # one-off scripts (e.g. create-admin)
│ └── uploads/ # bill/chat image uploads
├── frontend/ # React app (coming soon)
├── database/ # (or schema.sql at root) PostgreSQL schema
└── README.md

## Core Modules (planned/in progress)
- [x] Database schema (projects tree, employees, users, bills, attendance, salary, chat, audit log)
- [x] Auth (login, JWT, password reset, role middleware)
- [ ] Employees management
- [ ] Projects / Sub-projects (tender tree structure) + Sites
- [ ] Attendance tracking
- [ ] Salary (monthly, Pending/Partial/Paid tracking)
- [ ] Bills & Inventory (with image upload)
- [ ] Employee request/approval flow (Supervisor → Admin)
- [ ] Audit trail
- [ ] Messaging (project group chats + 1-to-1)
- [ ] Frontend (React + Tailwind)

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

3. Set up the database (run schema.sql against your PostgreSQL instance):
```bash
   psql -U app_user -d construction_app -f ../schema.sql
```

4. Create the initial Admin account:
```bash
   npm run create-admin
```

5. Start the server:
```bash
   npm start
```

6. Verify:
```bash
   curl http://localhost:5000/api/health
```

## Deployment Plan
- **Development:** local Ubuntu server
- **Production (planned):** Render or Railway (Node.js + managed PostgreSQL support)

