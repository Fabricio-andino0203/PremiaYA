import { themeOf } from '../lib/theme.js';

/**
 * Visual stamp card.
 * props: template-ish object { template_name|name, icon, color, stamps_required,
 *        reward_name, description }, stamps, status, holder (customer name), animate
 */
export default function StampCard({
  name,
  brand = 'PremiaYa',
  icon = '🥤',
  color = 'mango',
  stampsRequired = 8,
  stamps = 0,
  status = 'active',
  rewardName,
  holder,
  animate = true,
  compact = false,
}) {
  const theme = themeOf(color);
  const slots = Array.from({ length: stampsRequired }, (_, i) => i < stamps);
  const ready = status === 'reward_ready';
  const redeemed = status === 'redeemed';

  return (
    <div
      className={`relative overflow-hidden rounded-4xl ${theme.grad} text-white shadow-xl shadow-ink/10 ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      }`}
    >
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-widest text-white/70">
            {brand}
          </p>
          <h3 className={`truncate font-extrabold ${compact ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
            {name}
          </h3>
          {holder && (
            <p className="mt-0.5 truncate text-sm font-medium text-white/80">{holder}</p>
          )}
        </div>
        <span className={`shrink-0 ${compact ? 'text-3xl' : 'text-4xl'}`}>{icon}</span>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2.5">
        {slots.map((filled, i) => (
          <div
            key={i}
            style={animate && filled ? { animationDelay: `${i * 70}ms` } : undefined}
            className={`grid place-items-center rounded-full ${
              compact ? 'h-9 w-9 text-base' : 'h-11 w-11 text-lg'
            } ${
              filled
                ? `bg-white text-ink shadow-md ${animate ? 'animate-pop-in' : ''}`
                : 'border-2 border-dashed border-white/40 text-white/40'
            }`}
          >
            {filled ? icon : i + 1}
          </div>
        ))}
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white/85">
          {stamps}/{stampsRequired} sellos
        </p>
        {redeemed ? (
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
            Canjeada ✓
          </span>
        ) : ready ? (
          <span className="animate-pulse-soft rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink shadow">
            🎁 ¡Recompensa lista!
          </span>
        ) : rewardName ? (
          <span className="max-w-[55%] truncate rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            Premio: {rewardName}
          </span>
        ) : null}
      </div>
    </div>
  );
}
