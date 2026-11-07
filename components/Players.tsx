import type { View } from '@/lib/types';
import { avatar } from '@/lib/words';

export default function Players({ v, talking }: { v: View; talking: Record<string, boolean> }) {
  const sorted = [...v.players].sort((a, b) => b.score - a.score);
  return (
    <aside className="players">
      {sorted.map((p, i) => (
        <div key={p.id} className={'pl' + (v.guessed[p.id] ? ' ok' : '') + (p.id === v.drawer && v.phase === 'drawing' ? ' dr' : '')}>
          <span className="rk">#{i + 1}</span>
          <span className={'av' + (talking[p.pid] ? ' talk' : '')} style={{ background: avatar(p.name) }}>{p.name[0]?.toUpperCase()}</span>
          <span className="nm"><b>{p.name}{p.id === v.me ? ' (you)' : ''}</b><small key={p.score} className="bump">{p.score} pts</small></span>
          <span className="st">{p.id === v.drawer && v.phase !== 'lobby' && v.phase !== 'end' ? '✏️' : v.guessed[p.id] ? '✔️' : ''}</span>
        </div>
      ))}
    </aside>
  );
}
