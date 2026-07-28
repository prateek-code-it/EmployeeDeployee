const pool = require('../config/db');

// POST /api/salary/generate  (Admin only)
// body: { month, year }
// Creates a 'pending' salary_payments row for every active employee for that month,
// using their current monthly_salary as the base. Skips employees who already have one.
async function generateMonthlySalaries(req, res) {
  const { month, year } = req.body;

  if (!month || !year) {
    return res.status(400).json({ error: 'month and year are required' });
  }

  try {
    const employees = await pool.query('SELECT id, monthly_salary FROM employees WHERE is_active = true');

    const created = [];
    for (const emp of employees.rows) {
      const result = await pool.query(
        `INSERT INTO salary_payments (employee_id, pay_month, pay_year, base_salary, status)
         VALUES ($1, $2, $3, $4, 'pending')
         ON CONFLICT (employee_id, pay_month, pay_year) DO NOTHING
         RETURNING *`,
        [emp.id, month, year, emp.monthly_salary]
      );
      if (result.rows.length > 0) {
        created.push(result.rows[0]);
      }
    }

    res.status(201).json({
      message: `Generated ${created.length} salary record(s) for ${month}/${year}`,
      created,
    });
  } catch (err) {
    console.error('Generate monthly salaries error:', err);
    res.status(500).json({ error: 'Server error generating monthly salaries' });
  }
}

// GET /api/salary?employee_id=&month=&year=&status=
async function listSalaries(req, res) {
  const { employee_id, month, year, status } = req.query;

  const conditions = [];
  const values = [];
  let i = 1;

  if (employee_id) {
    conditions.push(`sp.employee_id = $${i++}`);
    values.push(employee_id);
  }
  if (month) {
    conditions.push(`sp.pay_month = $${i++}`);
    values.push(month);
  }
  if (year) {
    conditions.push(`sp.pay_year = $${i++}`);
    values.push(year);
  }
  if (status) {
    conditions.push(`sp.status = $${i++}`);
    values.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT sp.*, e.full_name AS employee_name,
              (sp.base_salary - sp.total_paid) AS balance_due
       FROM salary_payments sp
       JOIN employees e ON e.id = sp.employee_id
       ${whereClause}
       ORDER BY sp.pay_year DESC, sp.pay_month DESC, e.full_name ASC`,
      values
    );

    const pendingTotal = await pool.query(
      `SELECT COALESCE(SUM(sp.base_salary - sp.total_paid), 0) AS total_pending
       FROM salary_payments sp
       ${whereClause ? whereClause + " AND sp.status != 'paid'" : "WHERE sp.status != 'paid'"}`,
      values
    );

    res.json({
      salaries: result.rows,
      total_pending: parseFloat(pendingTotal.rows[0].total_pending),
    });
  } catch (err) {
    console.error('List salaries error:', err);
    res.status(500).json({ error: 'Server error fetching salaries' });
  }
}


// GET /api/salary/:id  (includes full payment transaction history)
async function getSalary(req, res) {
  const { id } = req.params;
  try {
    const salary = await pool.query(
      `SELECT sp.*, e.full_name AS employee_name,
              (sp.base_salary - sp.total_paid) AS balance_due
       FROM salary_payments sp
       JOIN employees e ON e.id = sp.employee_id
       WHERE sp.id = $1`,
      [id]
    );
    if (salary.rows.length === 0) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    const transactions = await pool.query(
      `SELECT spt.*, u.full_name AS marked_by_name
       FROM salary_payment_transactions spt
       LEFT JOIN users u ON u.id = spt.marked_by
       WHERE spt.salary_payment_id = $1
       ORDER BY spt.payment_date DESC, spt.created_at DESC`,
      [id]
    );

    res.json({ ...salary.rows[0], transactions: transactions.rows });
  } catch (err) {
    console.error('Get salary error:', err);
    res.status(500).json({ error: 'Server error fetching salary record' });
  }
}

// POST /api/salary/:id/payments  (Admin only)
// Records one payment (full or partial/advance). Updates total_paid and status automatically.
async function addPayment(req, res) {
  const { id } = req.params;
  const { amount, payment_mode, payment_date, notes } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'A valid amount is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const salaryResult = await client.query('SELECT * FROM salary_payments WHERE id = $1 FOR UPDATE', [id]);
    if (salaryResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Salary record not found' });
    }
    const salary = salaryResult.rows[0];

    await client.query(
      `INSERT INTO salary_payment_transactions (salary_payment_id, amount, payment_mode, payment_date, marked_by, notes)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6)`,
      [id, amount, payment_mode || null, payment_date || null, req.user.id, notes || null]
    );

    const newTotalPaid = parseFloat(salary.total_paid) + parseFloat(amount);
    let newStatus = 'partial';
    if (newTotalPaid >= parseFloat(salary.base_salary)) {
      newStatus = 'paid';
    } else if (newTotalPaid <= 0) {
      newStatus = 'pending';
    }

    const updated = await client.query(
      `UPDATE salary_payments SET total_paid = $1, status = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [newTotalPaid, newStatus, id]
    );

    await client.query('COMMIT');
    res.status(201).json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Add payment error:', err);
    res.status(500).json({ error: 'Server error recording payment' });
  } finally {
    client.release();
  }
}

module.exports = { generateMonthlySalaries, listSalaries, getSalary, addPayment };
