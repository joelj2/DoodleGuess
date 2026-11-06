import type { View } from '@/lib/types';

export default function Players({ v }: { v: View }) {
  const sorted = [...v.players].sort((a, b) => b.score - a.score);
  return (
    <aside>
      {sorted.map((p) => (
        <div key={p.id} className={'pl' + (v.guessed[p.id] ? ' ok' : '')}>
          <span>{p.id === v.drawer && v.phase !== 'lobby' ? '✏️ ' : ''}{p.name}{p.id === v.me ? ' (you)' : ''}</span>
          <b>{p.score}</b>
        </div>
      ))}
    </aside>
  );
}
