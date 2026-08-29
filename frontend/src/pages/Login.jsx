import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-[var(--ink)] mb-4">
            <span className="font-[var(--font-display)] text-[var(--accent)] text-2xl font-bold">CM</span>
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
            className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md text-[var(--ink)] focus:border-[var(--accent)] outline-none"
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
            className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md text-[var(--ink)] focus:border-[var(--accent)] outline-none"
            placeholder="********"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--ink-soft)] mt-6">
          Contact your Admin if you don't have login details.
        </p>
      </div>
    </div>
  );
}
