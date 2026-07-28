require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');

const employeeRoutes = require('./routes/employees');
const projectRoutes = require('./routes/projects');
const siteRoutes = require('./routes/sites');
const billRoutes = require('./routes/bills');
const attendanceRoutes = require('./routes/attendance');
const salaryRoutes = require('./routes/salary');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // serves bill/chat images

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salary', salaryRoutes);

// More routes (employees, projects, bills, attendance, salary, chat)
// will be added here in the next stages.

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
