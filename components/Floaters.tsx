import type { CSSProperties } from 'react';

const FLOAT = ['✏️', '🎨', '🖌️', '⭐', '🪣', '💡', '🖍️', '🎯', '🧽', '❤️', '🎈', '👑'];

/** Same floating doodles as the landing page, used as the animated game background. */
export default function Floaters() {
  return (
    <>
      {FLOAT.map((f, i) => (
        <span key={i} className="fl" style={{ '--x': `${(i * 37 + 11) % 92}%`, '--y': `${(i * 53 + 7) % 86}%`, '--s': `${28 + ((i * 13) % 34)}px`, '--d': `${6 + ((i * 7) % 6)}s`, '--dl': `${-i * 1.3}s` } as CSSProperties}>{f}</span>
      ))}
    </>
  );
}
