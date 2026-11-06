'use client';
import Canvas from '@/components/Canvas';
import Chat from '@/components/Chat';
import Home from '@/components/Home';
import Overlay from '@/components/Overlay';
import Players from '@/components/Players';
import { useGame } from '@/lib/useGame';

export default function Page() {
  const { screen, err, v, cv, code, isHost, create, join, net } = useGame();

  if (screen === 'home') return <Home err={err} onCreate={(n) => create(n)} onJoin={join} />;
  if (!v) return <main className="home"><h1>Connecting…</h1></main>;

  const canDraw = v.me === v.drawer && v.phase === 'drawing';
  const playing = v.phase === 'choosing' || v.phase === 'drawing' || v.phase === 'reveal';
  const title = v.phase === 'lobby' ? 'Waiting for players…' : v.phase === 'end' ? 'Game over' : v.word || v.hint || '…';

  return (
    <div className="game">
      <header>
        <span>Room <b>{code}</b></span>
        <span className="word">{title}</span>
        <span>{playing ? `Round ${v.round}/${v.rounds} · ${v.time}s` : ''}</span>
      </header>
      <Players v={v} />
      <section className="stage">
        <Canvas cv={cv} canDraw={canDraw} net={net}>
          <Overlay v={v} code={code} isHost={isHost} net={net} />
        </Canvas>
      </section>
      <Chat chat={v.chat} canDraw={canDraw} net={net} />
    </div>
  );
}
