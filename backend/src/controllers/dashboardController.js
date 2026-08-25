const pool = require('../config/db');

// GET /api/dashboard/summary
// Super Admin sees platform-wide totals. Everyone else sees only their own company's data.
async function getSummary(req, res) {
  try {
    const companyFilter = req.user.role === 'super_admin' ? null : req.user.company_id;

    const activeProjects = await pool.query(
      companyFilter
        ? "SELECT COUNT(*) FROM projects WHERE status = 'ongoing' AND company_id = $1"
        : "SELECT COUNT(*) FROM projects WHERE status = 'ongoing'",
      companyFilter ? [companyFilter] : []
    );

    const pendingSalary = await pool.query(
      companyFilter
        ? `SELECT COALESCE(SUM(sp.base_salary - sp.total_paid), 0) AS total
           FROM salary_payments sp JOIN employees e ON e.id = sp.employee_id
           WHERE sp.status != 'paid' AND e.company_id = $1`
        : "SELECT COALESCE(SUM(base_salary - total_paid), 0) AS total FROM salary_payments WHERE status != 'paid'",
      companyFilter ? [companyFilter] : []
    );

    const today = new Date().toISOString().slice(0, 10);
    const todayAttendance = await pool.query(
      companyFilter
        ? `SELECT a.status, COUNT(*) FROM attendance a
           JOIN employees e ON e.id = a.employee_id
           WHERE a.attendance_date = $1 AND e.company_id = $2 GROUP BY a.status`
        : `SELECT status, COUNT(*) FROM attendance WHERE attendance_date = $1 GROUP BY status`,
      companyFilter ? [today, companyFilter] : [today]
    );
    const attendanceSummary = { present: 0, absent: 0, half_day: 0, leave: 0 };
    todayAttendance.rows.forEach((r) => { attendanceSummary[r.status] = parseInt(r.count, 10); });

    const pendingEmployeeRequests = await pool.query(
      companyFilter
        ? `SELECT COUNT(*) FROM employee_requests er
           JOIN users u ON u.id = er.requested_by
           WHERE er.status = 'pending' AND u.company_id = $1`
        : "SELECT COUNT(*) FROM employee_requests WHERE status = 'pending'",
      companyFilter ? [companyFilter] : []
    );

    const pendingPRs = await pool.query(
      companyFilter
        ? `SELECT COUNT(*) FROM purchase_requests pr
           JOIN projects p ON p.id = pr.project_id
           WHERE pr.status = 'pending' AND p.company_id = $1`
        : "SELECT COUNT(*) FROM purchase_requests WHERE status = 'pending'",
      companyFilter ? [companyFilter] : []
    );

    const totalEmployees = await pool.query(
      companyFilter
        ? "SELECT COUNT(*) FROM employees WHERE is_active = true AND company_id = $1"
        : "SELECT COUNT(*) FROM employees WHERE is_active = true",
      companyFilter ? [companyFilter] : []
    );

    const recentActivity = await pool.query(
      companyFilter
        ? `SELECT al.*, u.full_name AS changed_by_name
           FROM audit_log al
           LEFT JOIN users u ON u.id = al.changed_by
           WHERE u.company_id = $1
           ORDER BY al.created_at DESC
           LIMIT 8`
        : `SELECT al.*, u.full_name AS changed_by_name
           FROM audit_log al
           LEFT JOIN users u ON u.id = al.changed_by
           ORDER BY al.created_at DESC
           LIMIT 8`,
      companyFilter ? [companyFilter] : []
    );

    res.json({
      active_projects: parseInt(activeProjects.rows[0].count, 10),
      total_employees: parseInt(totalEmployees.rows[0].count, 10),
      pending_salary_amount: parseFloat(pendingSalary.rows[0].total),
      today_attendance: attendanceSummary,
      pending_employee_requests: parseInt(pendingEmployeeRequests.rows[0].count, 10),
      pending_purchase_requests: parseInt(pendingPRs.rows[0].count, 10),
      recent_activity: recentActivity.rows,
    });
  } catch (err) {
    console.error('Get dashboard summary error:', err);
    res.status(500).json({ error: 'Server error fetching dashboard summary' });
  }
}

module.exports = { getSummary };
