import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import IdleWarningModal from './IdleWarningModal';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { logout } = useAuth();
  const { showWarning, secondsLeft, stayLoggedIn } = useIdleTimeout(() => {
    logout();
    window.location.href = '/login';
  });

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      {showWarning && (
        <IdleWarningModal secondsLeft={secondsLeft} onStayLoggedIn={stayLoggedIn} />
      )}
    </div>
  );
}
