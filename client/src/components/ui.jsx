import { timeAgo, formatDateTime } from '../lib/theme.js';
import { UserPlus, Stamp, Gift } from 'lucide-react';

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-3xl bg-white p-5 shadow-sm shadow-ink/5 ${className}`}>
      {children}
    </div>
  );
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-200 transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-white px-5 py-2.5 text-sm font-bold text-ink/75 transition hover:bg-ink/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/50">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/45">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-2xl border border-ink/10 bg-cream px-4 py-2.5 text-sm font-medium outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200';

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">
      {children}
    </p>
  );
}

export function SuccessNote({ children }) {
  if (!children) return null;
  return (
    <p className="rounded-2xl bg-lime-50 px-4 py-2.5 text-sm font-semibold text-green-700">
      {children}
    </p>
  );
}

export function EmptyState({ icon = '🧉', title, hint }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-ink/10 p-8 text-center">
      <p className="text-3xl">{icon}</p>
      <p className="mt-2 text-sm font-bold text-ink/70">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink/45">{hint}</p>}
    </div>
  );
}

const MOVEMENT_META = {
  register: { icon: UserPlus, classes: 'bg-sky-100 text-sky-600', label: 'Registro' },
  stamp: { icon: Stamp, classes: 'bg-amber-100 text-amber-600', label: 'Sello' },
  redeem: { icon: Gift, classes: 'bg-violet-100 text-violet-600', label: 'Canje' },
};

export function movementMeta(type) {
  return MOVEMENT_META[type] || MOVEMENT_META.stamp;
}

export function MovementRow({ movement, showCustomer = false, relative = false }) {
  const meta = movementMeta(movement.type);
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${meta.classes}`}>
        <Icon size={16} strokeWidth={2.4} />
      </span>
      <div className="min-w-0 flex-1">
        {showCustomer && (
          <p className="truncate text-sm font-bold">{movement.customer_name}</p>
        )}
        <p className="truncate text-sm font-medium text-ink/70">{movement.detail}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-ink/40">
        {relative ? timeAgo(movement.created_at) : formatDateTime(movement.created_at)}
      </span>
    </div>
  );
}
