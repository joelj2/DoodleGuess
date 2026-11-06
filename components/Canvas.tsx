'use client';
import { useRef, useState, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { H, W, type ClientMsg, type Pt } from '@/lib/types';
import { COLORS } from '@/lib/words';

interface Props { cv: RefObject<HTMLCanvasElement>; canDraw: boolean; net: (m: ClientMsg) => void; children?: ReactNode }
type Tool = 'pen' | 'fill' | 'erase';
const SIZES = [4, 8, 16, 30];

export default function Canvas({ cv, canDraw, net, children }: Props) {
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(8);
  const [tool, setTool] = useState<Tool>('pen');
  const last = useRef<Pt | null>(null);
  const key = useRef('');

  const pos = (e: PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  const col = tool === 'erase' ? '#ffffff' : color;
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    const p = pos(e); key.current = Math.random().toString(36).slice(2);
    if (tool === 'fill') return net({ t: 'fill', k: key.current, c: color, a: p });
    e.currentTarget.setPointerCapture(e.pointerId); last.current = p;
    net({ t: 'seg', k: key.current, c: col, w: size, a: p, b: p });
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!last.current || !canDraw) return;
    const p = pos(e); net({ t: 'seg', k: key.current, c: col, w: size, a: last.current, b: p }); last.current = p;
  };
  const up = () => { last.current = null; };

  return (
    <>
      <div className="cwrap">
        <canvas ref={cv} width={W} height={H} className={canDraw ? 'c-' + tool : ''} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        {children}
      </div>
      {canDraw && (
        <div className="tools">
          <div className="cur" style={{ background: color }} title="Current colour" />
          <div className="pal">
            {COLORS.map((c) => <i key={c} className={'sw' + (c === color ? ' on' : '')} style={{ background: c }} onClick={() => { setColor(c); if (tool === 'erase') setTool('pen'); }} />)}
          </div>
          <div className="grp">
            <button className={'tb' + (tool === 'pen' ? ' on' : '')} onClick={() => setTool('pen')} title="Pen">✏️</button>
            <button className={'tb' + (tool === 'fill' ? ' on' : '')} onClick={() => setTool('fill')} title="Fill bucket">🪣</button>
            <button className={'tb' + (tool === 'erase' ? ' on' : '')} onClick={() => setTool('erase')} title="Eraser">🧽</button>
          </div>
          <div className="grp">
            {SIZES.map((s) => <i key={s} className={'sz' + (s === size ? ' on' : '')} onClick={() => setSize(s)}><u style={{ width: s * 0.8 + 4, height: s * 0.8 + 4 }} /></i>)}
          </div>
          <div className="grp">
            <button className="tb" onClick={() => net({ t: 'undo' })} title="Undo">↩️</button>
            <button className="tb" onClick={() => net({ t: 'clr' })} title="Clear all">🗑️</button>
          </div>
        </div>
      )}
    </>
  );
}
