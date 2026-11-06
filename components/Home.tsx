'use client';
import { useState } from 'react';

interface Props { err: string; onCreate: (name: string) => void; onJoin: (name: string, code: string) => void }

export default function Home({ err, onCreate, onJoin }: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  return (
    <main className="home">
      <h1>Doodle<span>Guess</span></h1>
      <div className="card">
        <input placeholder="Nickname" maxLength={14} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" onClick={() => onCreate(name)}>Create room</button>
        <div className="or">or join with a code</div>
        <input placeholder="ROOM CODE" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="btn alt" onClick={() => onJoin(name, code)}>Join room</button>
        {err && <p className="err">{err}</p>}
      </div>
    </main>
  );
}
