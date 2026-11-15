const EMOJIS = ['🎉', '🥤', '🍓', '⭐', '🍍', '🫐', '🎊', '🥭'];

export default function Confetti({ burst }) {
  if (!burst) return null;
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    emoji: EMOJIS[i % EMOJIS.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    size: 16 + Math.random() * 18,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" key={burst}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute animate-fall"
          style={{
            left: `${p.left}%`,
            top: '-5vh',
            fontSize: p.size,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
