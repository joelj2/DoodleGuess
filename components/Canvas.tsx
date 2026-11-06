'use client';
import { useRef, useState, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { H, W, type ClientMsg, type Pt } from '@/lib/types';
import { COLORS } from '@/lib/words';

interface Props { cv: RefObject<HTMLCanvasElement>; canDraw: boolean; net: (m: ClientMsg) => void; children?: ReactNode }

export default function Canvas({ cv, canDraw, net, children }: Props) {
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(6);
  const last = useRef<Pt | null>(null);
  const key = useRef('');

  const pos = (e: PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos(e); key.current = Math.random().toString(36).slice(2); last.current = p;
    net({ t: 'seg', k: key.current, c: color, w: size, a: p, b: p });
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!last.current || !canDraw) return;
    const p = pos(e); net({ t: 'seg', k: key.current, c: color, w: size, a: last.current, b: p }); last.current = p;
  };
  const up = () => { last.current = null; };

  return (
    <>
      <div className="cwrap">
        <canvas ref={cv} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        {children}
      </div>
      {canDraw && (
        <div className="tools">
          {COLORS.map((c) => (
            <i key={c} className={'sw' + (c === color ? ' on' : '')} style={{ background: c }} onClick={() => setColor(c)} title={c === '#ffffff' ? 'Eraser' : c} />
          ))}
          {[3, 6, 12, 22].map((s) => (
            <i key={s} className={'sz' + (s === size ? ' on' : '')} onClick={() => setSize(s)}><u style={{ width: s, height: s }} /></i>
          ))}
          <button onClick={() => net({ t: 'undo' })}>Undo</button>
          <button onClick={() => net({ t: 'clr' })}>Clear</button>
        </div>
      )}
    </>
  );
}
