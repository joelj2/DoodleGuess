'use client';
import { useState } from 'react';
import type { ClientMsg, View } from '@/lib/types';

interface Props { v: View; code: string; isHost: boolean; net: (m: ClientMsg) => void }

export default function Overlay({ v, code, isHost, net }: Props) {
  const [rounds, setRounds] = useState(3);
  const sorted = [...v.players].sort((a, b) => b.score - a.score);
  const drawerName = v.players.find((p) => p.id === v.drawer)?.name ?? 'Someone';

  if (v.phase === 'lobby') return (
    <div className="ov">
      <div>Share this room code</div><h2>{code}</h2>
      {isHost ? (
        <>
          <select style={{ width: 160 }} value={rounds} onChange={(e) => setRounds(+e.target.value)}>
            {[2, 3, 5, 8].map((n) => <option key={n} value={n}>{n} rounds</option>)}
          </select>
          <button className="btn" onClick={() => net({ t: 'start', rounds })}>Start game</button>
        </>
      ) : <div>Waiting for the host to start…</div>}
    </div>
  );
  if (v.phase === 'choosing') return (
    <div className="ov">
      {v.me === v.drawer ? (
        <>
          <div>Choose a word to draw</div>
          {v.opts.map((w) => <button key={w} className="btn alt" onClick={() => net({ t: 'pick', w })}>{w}</button>)}
        </>
      ) : <div>{drawerName} is choosing a word…</div>}
    </div>
  );
  if (v.phase === 'reveal') return <div className="ov"><div>The word was</div><h2>{v.word}</h2></div>;
  if (v.phase === 'end') return (
    <div className="ov">
      <h2>🏆 {sorted[0]?.name}</h2>
      {sorted.map((p, i) => <div key={p.id}>{i + 1}. {p.name} — {p.score}</div>)}
      {isHost && <button className="btn" onClick={() => net({ t: 'start', rounds: v.rounds })}>Play again</button>}
    </div>
  );
  return null;
}
