import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function ResetPassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateStoredUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      updateStoredUser({ must_reset_password: false });
      navigate('/');
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
          <h1>Set a new password</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">
            For security, please set your own password before continuing.
          </p>
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
            Current (temporary) password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoFocus
            className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md text-[var(--ink)] focus:border-[var(--accent)] outline-none"
          />

          <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">
            New password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md text-[var(--ink)] focus:border-[var(--accent)] outline-none"
            placeholder="At least 8 characters"
          />

          <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">
            Confirm new password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md text-[var(--ink)] focus:border-[var(--accent)] outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
