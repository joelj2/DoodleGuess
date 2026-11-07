'use client';
import { useEffect, type CSSProperties } from 'react';
import Canvas from '@/components/Canvas';
import Chat from '@/components/Chat';
import Floaters from '@/components/Floaters';
import Home from '@/components/Home';
import Overlay from '@/components/Overlay';
import Players from '@/components/Players';
import { useGame } from '@/lib/useGame';
import { useVoice } from '@/lib/useVoice';
import type { Player } from '@/lib/types';
import { beep } from '@/lib/words';

const NONE: Player[] = [];

export default function Page() {
  const { screen, err, v, peer, cv, code, isHost, create, join, net } = useGame();
  const canDraw = !!v && v.me === v.drawer && v.phase === 'drawing';
  const voice = useVoice(peer, v?.players ?? NONE, canDraw); // the drawer is auto-muted so they can't give hints
  const t = v?.time ?? 0, ph = v?.phase;
  useEffect(() => { if (ph === 'drawing' && t > 0 && t <= 10) beep(500 + (10 - t) * 40, 80); }, [t, ph]);

  if (screen === 'home') return <Home err={err} onCreate={(n) => create(n)} onJoin={join} />;
  if (!v) return <main className="home"><h1>Connecting…</h1></main>;

  const playing = v.phase === 'choosing' || v.phase === 'drawing' || v.phase === 'reveal';
  const total = v.phase === 'drawing' ? 80 : v.phase === 'choosing' ? 15 : 6;
  const pct = playing ? Math.max(0, (v.time / total) * 100) : 0;
  const label = v.phase === 'drawing' ? (canDraw ? 'DRAW THIS' : 'GUESS THIS') : '';
  const title = v.phase === 'lobby' ? 'Waiting for players…' : v.phase === 'end' ? 'Game over' : v.word || v.hint || '…';
  const mic = !voice.on ? { c: 'off', t: '🎤 Join voice' } : canDraw ? { c: 'forced', t: '🤐 Muted while drawing' } : voice.muted ? { c: 'muted', t: '🔇 Unmute' } : { c: 'live', t: '🎙️ Mic on' };

  return (
    <>
      <div className="gbg"><Floaters /></div>
      {voice.err && <div className="toast">⚠️ {voice.err}</div>}
      <div className="game">
        <header>
          <div className={'clock' + (playing && v.time <= 10 ? ' hot' : '')} style={{ '--p': pct } as CSSProperties}><b>{playing ? v.time : '⏸'}</b></div>
          <div className="round">{playing ? `Round ${v.round} of ${v.rounds}` : 'DoodleGuess'}</div>
          <div className="wordbox">
            <small>{label}{playing && <span className="rn"> · {v.round}/{v.rounds}</span>}</small>
            <div className="word">{title.split('').map((c, i) => <span key={i + c} className="ch">{c}</span>)}</div>
          </div>
          <div className="room">
            <span>Room <b>{code}</b></span>
            <button className={'mic ' + mic.c} onClick={voice.toggle} disabled={mic.c === 'forced'}>{mic.t}</button>
          </div>
        </header>
        <div className="bar"><i style={{ width: pct + '%', background: `hsl(${pct * 1.2} 85% 55%)` }} /></div>
        <Players v={v} talking={voice.talking} />
        <section className="stage">
          <Canvas cv={cv} canDraw={canDraw} net={net}>
            <Overlay v={v} code={code} isHost={isHost} net={net} />
          </Canvas>
        </section>
        <Chat chat={v.chat} canDraw={canDraw} net={net} />
      </div>
    </>
  );
}
