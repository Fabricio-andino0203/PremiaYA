export default function Brand({ size = 'md', sub }) {
  const iconClass = size === 'lg' ? 'h-14 w-14 text-3xl rounded-3xl' : 'h-10 w-10 text-xl rounded-2xl';
  const textClass = size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid place-items-center bg-gradient-to-br from-brand-600 to-sun shadow-md shadow-brand-200 ${iconClass}`}
      >
        🎁
      </span>
      <div className="leading-tight">
        <p className={`font-extrabold tracking-tight ${textClass}`}>
          Premia<span className="text-sun">Ya</span>
        </p>
        {sub && <p className="text-xs font-semibold text-ink/45">{sub}</p>}
      </div>
    </div>
  );
}
