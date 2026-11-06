'use client';
import { useEffect, useRef, useState } from 'react';
import type { ChatMsg, ClientMsg } from '@/lib/types';
import { beep } from '@/lib/words';

interface Props { chat: ChatMsg[]; canDraw: boolean; net: (m: ClientMsg) => void }

export default function Chat({ chat, canDraw, net }: Props) {
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
    if (chat[chat.length - 1]?.ok) beep(880, 220);
  }, [chat.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <aside className="chat">
      <div className="msgs" ref={box}>
        {chat.map((m, i) => (
          <p key={i} className={(m.sys ? 'sys ' : '') + (m.ok ? 'good ' : '') + (m.to ? 'close' : '')}>
            {!m.sys && <b>{m.n}: </b>}{m.text}
          </p>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { net({ t: 'guess', text }); setText(''); } }}>
        <input placeholder={canDraw ? 'You are drawing!' : 'Type your guess here…'} value={text} disabled={canDraw} maxLength={60} onChange={(e) => setText(e.target.value)} />
      </form>
    </aside>
  );
}
