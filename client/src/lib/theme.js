export const THEMES = {
  mango: {
    label: 'Mango',
    grad: 'bg-gradient-to-br from-amber-400 to-orange-500',
    soft: 'bg-amber-50',
    chip: 'bg-amber-100 text-amber-800',
    text: 'text-orange-500',
    dot: 'bg-orange-500',
  },
  strawberry: {
    label: 'Fresa',
    grad: 'bg-gradient-to-br from-pink-400 to-rose-500',
    soft: 'bg-rose-50',
    chip: 'bg-rose-100 text-rose-800',
    text: 'text-rose-500',
    dot: 'bg-rose-500',
  },
  kiwi: {
    label: 'Kiwi',
    grad: 'bg-gradient-to-br from-lime-400 to-green-600',
    soft: 'bg-lime-50',
    chip: 'bg-lime-100 text-lime-800',
    text: 'text-green-600',
    dot: 'bg-green-600',
  },
  berry: {
    label: 'Mora',
    grad: 'bg-gradient-to-br from-violet-500 to-purple-700',
    soft: 'bg-violet-50',
    chip: 'bg-violet-100 text-violet-800',
    text: 'text-purple-600',
    dot: 'bg-purple-600',
  },
  ocean: {
    label: 'Menta',
    grad: 'bg-gradient-to-br from-cyan-400 to-teal-500',
    soft: 'bg-teal-50',
    chip: 'bg-teal-100 text-teal-800',
    text: 'text-teal-500',
    dot: 'bg-teal-500',
  },
};

export const themeOf = (color) => THEMES[color] || THEMES.mango;

export const ICON_OPTIONS = ['🥤', '🧋', '🍹', '🍓', '🥭', '🍍', '🫐', '🍊', '🥝', '🍉'];

export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function timeAgo(iso) {
  const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 60) return 'hace instantes';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} día${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months === 1 ? '' : 'es'}`;
}
