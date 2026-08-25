# Roadmap & Known Issues

## 🔴 Urgent — fix before continuing new development

1. **Security leak:** Dashboard "Recent Activity" and Audit Log are not company-scoped —
   any company can see another company's activity. Must filter by company_id (super_admin
   sees all, everyone else sees only their own company).
2. **Super Admin UX:** Super Admin is currently tangled with "company data" in the UI.
   Needs a clean, decoupled platform-level view — manages companies/config, not tied to
   any single company's employees/projects/etc.
3. **Users page for Super Admin:** Currently requires a `company_id` query param or shows
   empty. Super Admin should see ALL users across ALL companies (company_head, supervisor,
   employee) by default, filterable by company.

## 📋 Full Feature Roadmap (post-urgent-fixes)

### 1. Role-Based Access Control & User Management
- Super Admin fully decoupled from individual companies (platform-level config, multi-tenant oversight)
- User provisioning: Company Head, Admin, and HR roles can all create/manage user accounts
- Employee Code format upgrade: `[Company Code]-[Post/Designation Code]-[Serial No]`
  (current format is just `EMP-0001`, needs company + post prefix)
- Login: User ID/Employee Code + Password, with mandatory email in employee profile
- Extensible roles/designations at onboarding: HR Head/Assistant, Purchaser/Store Manager,
  Safety Engineer, Executive Engineer, Quality Engineer, Civil/Mechanical/Electrical Site Engineers

### 2. Employee Self-Service (ESS) Portal
- Employees self-manage personal details, bank account info, credentials
- Leave management: application, tracking, balance
- Company Noticeboard: circulars/notices/announcements from Admin/Company Head, shown on
  every user's dashboard

### 3. Vendor & Procurement Management
- Restrict sales/procurement selections to pre-approved vendor/purchaser master records only

### 4. Project Master & Resource Allocation
- Project schema additions: Client Name, Tender/WO Reference, Work Order Value, Scope/Description
- Multi-project assignment with an automated warning when an already-assigned employee is
  allocated to a new project
- Role-wise resource summary in project overview

### 5. Project Document Management System (DMS)
- Default categories: Work Order, BOQ/SOQR & Tech Specs, RA Bills, Test & Quality Reports,
  Drawings, DPR, Inward/Outward Correspondence
- Custom categories: searchable dropdown + "Add New Document Type"
- Privacy: documents private to uploader by default, must be explicitly shared with team

### 6. DPR Module changes
- Restrict DPR creation to Site Engineers only
- Remove Weather field
- Manpower: split into Skilled / Unskilled counts
- Material Tracking: Material Received (Qty) + Material Required (Qty)
- Add "Next Day Planning" section
- Date-range filtering for DPR history

### 7. Further user specialization
- Split generic "Employee" role into: HR, Supervisor, Site Manager, and others (TBD)
- Dashboard specialized per user type
