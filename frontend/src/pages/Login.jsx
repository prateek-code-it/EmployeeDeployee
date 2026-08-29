import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { HardHat, Sun, Moon } from 'lucide-react';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(loginId, password);
      if (user.must_reset_password) {
        navigate('/reset-password');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--bg)] px-4 py-6 relative">
      {/* Top Right Theme Toggle Switch */}
      <div className="absolute top-5 right-5 flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--ink-soft)] capitalize">{theme} Mode</span>
        <button
          onClick={toggleTheme}
          type="button"
          className="relative w-12 h-6 rounded-full bg-[var(--surface)] border border-[var(--line)] p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer"
          aria-label="Toggle theme"
        >
          <div
            className={`w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center shadow-md transform transition-transform duration-300 ${
              theme === 'light' ? 'translate-x-6' : 'translate-x-0'
            }`}
          >
            {theme === 'light' ? (
              <Sun className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <Moon className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </div>
        </button>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--surface)] border border-[var(--line)] mb-4 text-[var(--accent)] shadow-sm">
              <HardHat className="w-6 h-6" />
            </div>
            <h1>Employee Deployee</h1>
            <p className="text-[var(--ink-soft)] text-sm mt-1">Sign in to your account</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-6 shadow-sm"
          >
            {error && (
              <div className="status-tag status-bad w-full mb-4 py-2 justify-center">
                {error}
              </div>
            )}

            <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">
              Login ID
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md text-[var(--ink)] bg-transparent focus:border-[var(--accent)] outline-none"
              placeholder="e.g. user001"
            />

            <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md text-[var(--ink)] bg-transparent focus:border-[var(--accent)] outline-none"
              placeholder="********"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--ink-soft)] mt-6">
            Contact your Admin if you don't have login details.
          </p>
        </div>
      </div>

      {/* Footer Line */}
      <footer className="text-center text-xs text-[var(--ink-soft)] pt-4">
        © {new Date().getFullYear()} EmployeeDeployee. All rights reserved.
      </footer>
    </div>
  );
}
