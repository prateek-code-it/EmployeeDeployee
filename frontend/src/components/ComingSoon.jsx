export default function ComingSoon({ title }) {
  return (
    <div className="p-6">
      <h1 className="mb-6">{title}</h1>
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-12 text-center">
        <p className="text-[var(--ink-soft)] text-sm">This page is coming up next.</p>
      </div>
    </div>
  );
}
