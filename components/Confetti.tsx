import type { CSSProperties } from 'react';

const C = ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#fb923c', '#c084fc'];

export default function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 44 }, (_, i) => (
        <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--c': C[i % 6], '--d': `${2.6 + (i % 5) * 0.4}s`, '--dl': `${(i % 8) * 0.25}s`, '--r': `${(i * 47) % 360}deg` } as CSSProperties} />
      ))}
    </div>
  );
}
