import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ComingSoon from './components/ComingSoon';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import Bills from './pages/Bills';
import Attendance from './pages/Attendance';
import Material from './pages/Material';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/attendance" element={<Attendance />} />
	    <Route path="/material" element={<Material />} />
            <Route path="/salary" element={<ComingSoon title="Salary" />} />
            <Route path="/requests" element={<ComingSoon title="Employee Requests" />} />
            <Route path="/chat" element={<ComingSoon title="Messages" />} />
            <Route path="/audit-log" element={<ComingSoon title="Audit Log" />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
