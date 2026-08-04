export default function IdleWarningModal({ secondsLeft, onStayLoggedIn }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] bg-[var(--surface)] border border-[var(--line)] rounded-lg shadow-lg p-4 w-72 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <div className="status-tag status-warn shrink-0" style={{ padding: '4px' }} />
        <div className="flex-1">
          <p className="text-sm font-medium mb-0.5">Still there?</p>
          <p className="text-xs text-[var(--ink-soft)] mb-3">
            You'll be logged out in {secondsLeft}s due to inactivity.
          </p>
          <button
            onClick={onStayLoggedIn}
            className="w-full py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-xs hover:brightness-95 transition"
          >
            Stay logged in
          </button>
        </div>
      </div>
    </div>
  );
}
