'use client';
import { useEffect, useRef, useState } from 'react';
import type { ChatMsg, ClientMsg } from '@/lib/types';

interface Props { chat: ChatMsg[]; canDraw: boolean; net: (m: ClientMsg) => void }

export default function Chat({ chat, canDraw, net }: Props) {
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [chat.length]);
  return (
    <aside className="chat">
      <div className="msgs" ref={box}>
        {chat.map((m, i) => <p key={i} className={m.sys ? 'sys' : ''}>{!m.sys && <b>{m.n}: </b>}{m.text}</p>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { net({ t: 'guess', text }); setText(''); } }}>
        <input placeholder={canDraw ? 'You are drawing!' : 'Type your guess…'} value={text} disabled={canDraw} onChange={(e) => setText(e.target.value)} />
      </form>
    </aside>
  );
}
