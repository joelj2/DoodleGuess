'use client';
import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { avatar } from '@/lib/words';

interface Props {
  err: string;
  onCreate: (name: string) => void | Promise<void>;
  onJoin: (name: string, code: string) => void | Promise<void>;
}
const LOGO = 'DoodleGuess'.split('');
const COLS = ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#fb923c', '#c084fc'];
const FLOAT = ['✏️', '🎨', '🖌️', '⭐', '🪣', '💡', '🖍️', '🎯', '🧽', '❤️', '🎈', '👑'];

export default function Home({ err, onCreate, onJoin }: Props) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [chars, setChars] = useState(['', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const code = chars.join('');

  useEffect(() => { setBusy(false); }, [err]);
  useEffect(() => { // opened from an invite link like /?room=ABCD
    const r = new URLSearchParams(window.location.search).get('room');
    if (r && /^[A-Za-z]{4}$/.test(r)) { const c = r.toUpperCase(); setInvite(c); setMode('join'); setChars(c.split('')); }
  }, []);
  const leaveInvite = () => { setInvite(''); setChars(['', '', '', '']); window.history.replaceState(null, '', window.location.pathname); };

  const setAt = (i: number, val: string) => {
    const ch = val.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
    setChars((c) => c.map((x, j) => (j === i ? ch : x)));
    if (ch && i < 3) refs.current[i + 1]?.focus();
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData('text');
    const m = /room\s+([A-Za-z]{4})/i.exec(raw); // works with the "Copy invite" text too
    const t = (m ? m[1] : raw.replace(/[^A-Za-z]/g, '')).toUpperCase().slice(0, 4);
    if (!t) return;
    e.preventDefault(); setChars([0, 1, 2, 3].map((i) => t[i] ?? '')); refs.current[Math.min(t.length, 3)]?.focus();
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    if (name.trim() && (mode === 'create' || code.length === 4)) { setBusy(true); setTimeout(() => setBusy(false), 10000); }
    if (mode === 'create') await onCreate(name); else await onJoin(name, code);
  };

  return (
    <main className="home">
      {FLOAT.map((f, i) => (
        <span key={i} className="fl" style={{ '--x': `${(i * 37 + 11) % 92}%`, '--y': `${(i * 53 + 7) % 86}%`, '--s': `${28 + ((i * 13) % 34)}px`, '--d': `${6 + ((i * 7) % 6)}s`, '--dl': `${-i * 1.3}s` } as CSSProperties}>{f}</span>
      ))}

      <div className="brand">
        <h1 className="logo">{LOGO.map((l, i) => <span key={i} style={{ '--i': i, '--c': COLS[i % COLS.length] } as CSSProperties}>{l}</span>)}</h1>
        <svg className="squig" viewBox="0 0 290 18"><path d="M5 10 Q 40 -4 75 10 T 145 10 T 215 10 T 285 10" /></svg>
        <p className="tag">Draw it. Guess it. Win it.</p>
      </div>

      <form className="glass" onSubmit={submit}>
        <div className="pwrap"><div className="pav" key={name.length} style={{ background: name ? avatar(name) : '#94a3b8' }}>{name ? name[0].toUpperCase() : '✏️'}</div></div>

        {invite ? (
          <div className="invite">
            <div className="inv-t">🎉 You’re invited!</div>
            <div className="inv-code">{invite.split('').map((c, i) => <b key={i} style={{ '--i': i } as CSSProperties}>{c}</b>)}</div>
            <div className="inv-s">Just enter your name to join the game</div>
            <button type="button" className="inv-x" onClick={leaveInvite}>Use a different room</button>
          </div>
        ) : (
        <div className={'tabs ' + mode}>
          <i />
          <button type="button" className={mode === 'create' ? 'on' : ''} onClick={() => setMode('create')}>Create room</button>
          <button type="button" className={mode === 'join' ? 'on' : ''} onClick={() => setMode('join')}>Join room</button>
        </div>
        )}

        <label className="fld">
          <input placeholder=" " maxLength={14} value={name} autoFocus autoComplete="off" onChange={(e) => setName(e.target.value)} />
          <span>Your nickname</span>
        </label>

        {mode === 'join' && !invite && (
          <div className="codewrap">
            <div className="clab">Enter room code</div>
            <div className="code">
              {chars.map((c, i) => (
                <input key={i} ref={(el) => { refs.current[i] = el; }} className={c ? 'has' : ''} value={c} maxLength={2} inputMode="text" autoComplete="off"
                  onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} onPaste={onPaste} onFocus={(e) => e.target.select()} />
              ))}
            </div>
          </div>
        )}

        <button className={'cta ' + mode} type="submit" disabled={busy}>
          {busy ? <><span className="spin" />Connecting…</> : mode === 'create' ? '🎨  Create room' : invite ? '🚀  Join game' : '🚀  Join room'}
        </button>
        {err && <p key={err} className="err">⚠️ {err}</p>}
      </form>

      <div className="chips"><span>🎨 Draw</span><span>💬 Guess</span><span>🏆 Win</span><span>👥 2–12 players</span></div>
    </main>
  );
}
