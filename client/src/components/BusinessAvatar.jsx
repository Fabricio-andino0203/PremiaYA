import { themeOf } from '../lib/theme.js';

const SIZES = {
  sm: 'h-9 w-9 rounded-xl text-lg',
  md: 'h-10 w-10 rounded-2xl text-xl',
  lg: 'h-16 w-16 rounded-3xl text-3xl',
};

/** Logo del negocio si existe; si no, su emoji sobre el gradiente de su color. */
export default function BusinessAvatar({ business, size = 'md', className = '' }) {
  const sz = SIZES[size] || SIZES.md;
  if (business?.logo) {
    return (
      <img
        src={business.logo}
        alt={business?.name || 'Logo'}
        className={`shrink-0 bg-white object-cover shadow-md ${sz} ${className}`}
      />
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center text-white shadow-md ${themeOf(business?.theme).grad} ${sz} ${className}`}
    >
      {business?.icon || '🎁'}
    </span>
  );
}
