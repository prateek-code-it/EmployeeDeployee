const pool = require('../config/db');

// GET /api/dashboard/summary
async function getSummary(req, res) {
  try {
    const activeProjects = await pool.query(
      "SELECT COUNT(*) FROM projects WHERE status = 'ongoing'"
    );

    const pendingSalary = await pool.query(
      "SELECT COALESCE(SUM(base_salary - total_paid), 0) AS total FROM salary_payments WHERE status != 'paid'"
    );

    const today = new Date().toISOString().slice(0, 10);
    const todayAttendance = await pool.query(
      `SELECT status, COUNT(*) FROM attendance WHERE attendance_date = $1 GROUP BY status`,
      [today]
    );
    const attendanceSummary = { present: 0, absent: 0, half_day: 0, leave: 0 };
    todayAttendance.rows.forEach((r) => { attendanceSummary[r.status] = parseInt(r.count, 10); });

    const pendingEmployeeRequests = await pool.query(
      "SELECT COUNT(*) FROM employee_requests WHERE status = 'pending'"
    );

    const pendingPRs = await pool.query(
      "SELECT COUNT(*) FROM purchase_requests WHERE status = 'pending'"
    );

    const totalEmployees = await pool.query(
      "SELECT COUNT(*) FROM employees WHERE is_active = true"
    );

    const recentActivity = await pool.query(
      `SELECT al.*, u.full_name AS changed_by_name
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.changed_by
       ORDER BY al.created_at DESC
       LIMIT 8`
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

