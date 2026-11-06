'use client';
import { useEffect, type CSSProperties } from 'react';
import Canvas from '@/components/Canvas';
import Chat from '@/components/Chat';
import Floaters from '@/components/Floaters';
import Home from '@/components/Home';
import Overlay from '@/components/Overlay';
import Players from '@/components/Players';
import { useGame } from '@/lib/useGame';
import { beep } from '@/lib/words';

export default function Page() {
  const { screen, err, v, cv, code, isHost, create, join, net } = useGame();
  const t = v?.time ?? 0, ph = v?.phase;
  useEffect(() => { if (ph === 'drawing' && t > 0 && t <= 10) beep(500 + (10 - t) * 40, 80); }, [t, ph]);

  if (screen === 'home') return <Home err={err} onCreate={(n) => create(n)} onJoin={join} />;
  if (!v) return <main className="home"><h1>Connecting…</h1></main>;

  const canDraw = v.me === v.drawer && v.phase === 'drawing';
  const playing = v.phase === 'choosing' || v.phase === 'drawing' || v.phase === 'reveal';
  const total = v.phase === 'drawing' ? 80 : v.phase === 'choosing' ? 15 : 6;
  const pct = playing ? Math.max(0, (v.time / total) * 100) : 0;
  const label = v.phase === 'drawing' ? (canDraw ? 'DRAW THIS' : 'GUESS THIS') : '';
  const title = v.phase === 'lobby' ? 'Waiting for players…' : v.phase === 'end' ? 'Game over' : v.word || v.hint || '…';

  return (
    <>
      <div className="gbg"><Floaters /></div>
      <div className="game">
        <header>
          <div className={'clock' + (playing && v.time <= 10 ? ' hot' : '')} style={{ '--p': pct } as CSSProperties}><b>{playing ? v.time : '⏸'}</b></div>
          <div className="round">{playing ? `Round ${v.round} of ${v.rounds}` : 'DoodleGuess'}</div>
          <div className="wordbox">
            <small>{label}</small>
            <div className="word">{title.split('').map((c, i) => <span key={i + c} className="ch">{c}</span>)}</div>
          </div>
          <div className="room">Room <b>{code}</b></div>
        </header>
        <div className="bar"><i style={{ width: pct + '%', background: `hsl(${pct * 1.2} 85% 55%)` }} /></div>
        <Players v={v} />
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
