'use client';
import { useState, type CSSProperties } from 'react';
import type { ClientMsg, View } from '@/lib/types';
import { avatar } from '@/lib/words';
import Confetti from './Confetti';

interface Props { v: View; code: string; isHost: boolean; net: (m: ClientMsg) => void }
const Dots = () => <span className="dots"><i /><i /><i /></span>;

export default function Overlay({ v, code, isHost, net }: Props) {
  const [rounds, setRounds] = useState(3);
  const [copied, setCopied] = useState(false);
  const link = () => `${location.origin}${location.pathname}?room=${code}`;
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const sorted = [...v.players].sort((a, b) => b.score - a.score);
  const drawer = v.players.find((p) => p.id === v.drawer);

  if (v.phase === 'lobby') return (
    <div className="ov">
      <div className="lab">Room code</div>
      <h2>{code}</h2>
      <div className="invbtns">
        <button className="btn ghost" onClick={() => { navigator.clipboard?.writeText(`Join my DoodleGuess room ${code}: ${link()}`); setCopied(true); setTimeout(() => setCopied(false), 2500); }}>
          {copied ? '✔ Link copied' : '🔗 Copy invite link'}
        </button>
        {canShare && <button className="btn ghost" onClick={() => navigator.share({ title: 'DoodleGuess', text: 'Join my DoodleGuess room!', url: link() }).catch(() => {})}>📤 Share</button>}
      </div>
      <div className="lnk">{link()}</div>
      <div className="roster">{v.players.map((p) => <span key={p.id} className="av" title={p.name} style={{ background: avatar(p.name) }}>{p.name[0]?.toUpperCase()}</span>)}</div>
      <div className="lab">{v.players.length} player{v.players.length > 1 ? 's' : ''} in the lobby</div>
      {isHost ? (
        <>
          <select value={rounds} onChange={(e) => setRounds(+e.target.value)}>
            {[2, 3, 5, 8].map((n) => <option key={n} value={n}>{n} rounds</option>)}
          </select>
          <button className="btn big go" onClick={() => net({ t: 'start', rounds })}>▶ Start game</button>
        </>
      ) : <div className="lab">Waiting for the host<Dots /></div>}
    </div>
  );
  if (v.phase === 'choosing') return (
    <div className="ov">
      {v.me === v.drawer ? (
        <>
          <div className="lab">Your turn! Choose a word to draw</div>
          <div className="opts">{v.opts.map((w) => <button key={w} className="btn big alt" onClick={() => net({ t: 'pick', w })}>{w}</button>)}</div>
          <div className="lab">Auto-picking in {v.time}s</div>
        </>
      ) : (
        <>
          <span className="av xl" style={{ background: avatar(drawer?.name ?? '?') }}>{drawer?.name[0]?.toUpperCase()}</span>
          <div className="lab">{drawer?.name ?? 'Someone'} is choosing a word<Dots /></div>
        </>
      )}
    </div>
  );
  if (v.phase === 'reveal') {
    const got = v.players.filter((p) => v.gain[p.id]);
    return (
      <div className="ov">
        <div className="lab">The word was</div>
        <h2>{v.word.split('').map((c, i) => <span key={i} style={{ '--i': i } as CSSProperties}>{c === ' ' ? '\u00a0' : c}</span>)}</h2>
        <div className="gains">
          {got.map((p, i) => <div key={p.id} style={{ '--i': i } as CSSProperties}><span>{p.name}</span><b>+{v.gain[p.id]}</b></div>)}
          {!got.length && <div className="lab">Nobody guessed it 😅</div>}
        </div>
      </div>
    );
  }
  if (v.phase === 'end') return (
    <div className="ov">
      <Confetti />
      <div className="lab">Game over</div>
      <div className="podium">
        {[1, 0, 2].map((i) => sorted[i] && (
          <div key={i} className={'pod p' + i}>
            {i === 0 && <span className="crown">👑</span>}
            <span className="av lg" style={{ background: avatar(sorted[i].name) }}>{sorted[i].name[0]?.toUpperCase()}</span>
            <b>{sorted[i].name}</b>
            <div className="blk" style={{ height: [150, 110, 80][i] }}>{sorted[i].score}</div>
          </div>
        ))}
      </div>
      {sorted.length > 3 && <div className="gains">{sorted.slice(3).map((p, i) => <div key={p.id} style={{ '--i': i } as CSSProperties}><span>{i + 4}. {p.name}</span><b>{p.score}</b></div>)}</div>}
      {isHost ? <button className="btn big go" onClick={() => net({ t: 'start', rounds: v.rounds })}>🔁 Play again</button> : <div className="lab">Waiting for the host<Dots /></div>}
    </div>
  );
  return null;
}
