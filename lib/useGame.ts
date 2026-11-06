'use client';
import { useEffect, useRef, useState } from 'react';
import type { DataConnection, Peer } from 'peerjs';
import { ClientMsg, DrawMsg, GameState, H, HostMsg, Seg, View, W } from './types';
import { WORDS, mask, pick } from './words';

interface Room {
  conns: Record<string, DataConnection>; conn: DataConnection | null; peer: Peer | null;
  segs: Seg[]; G: GameState; host: boolean; code: string; timer: ReturnType<typeof setInterval> | null;
}
const blank = (name = ''): GameState => ({
  players: name ? [{ id: 'host', name, score: 0 }] : [], phase: 'lobby', round: 0, rounds: 3,
  order: [], turn: 0, drawer: null, word: '', rev: [], opts: [], time: 0, chat: [], guessed: {},
});

export function useGame() {
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [err, setErr] = useState('');
  const [v, setV] = useState<View | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const R = useRef<Room>({ conns: {}, conn: null, peer: null, segs: [], G: blank(), host: false, code: '', timer: null }).current;

  // ---------- canvas ----------
  const line = (m: Seg) => {
    const c = cv.current; if (!c) return;
    const x = c.getContext('2d')!;
    x.strokeStyle = m.c; x.lineWidth = m.w; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(m.a[0] * W, m.a[1] * H); x.lineTo(m.b[0] * W + 0.01, m.b[1] * H); x.stroke();
  };
  const redraw = () => {
    const c = cv.current; if (!c) return;
    const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    R.segs.forEach(line);
  };
  const op = (m: DrawMsg) => {
    if (m.t === 'seg') { R.segs.push(m); line(m); }
    else if (m.t === 'clr') { R.segs = []; redraw(); }
    else if (m.t === 'undo') {
      const k = R.segs.length ? R.segs[R.segs.length - 1].k : '';
      R.segs = R.segs.filter((s) => s.k !== k); redraw();
    } else { R.segs = m.segs; redraw(); }
  };

  // ---------- host: the host's browser is the game server ----------
  const send = (id: string, m: HostMsg) => { try { R.conns[id]?.send(m); } catch { /* peer gone */ } };
  const viewOf = (id: string): View => {
    const G = R.G; const reveal = id === G.drawer || G.phase === 'reveal' || G.phase === 'end';
    return { me: id, players: G.players, phase: G.phase, round: G.round, rounds: G.rounds, drawer: G.drawer, time: G.time,
      chat: G.chat, opts: id === G.drawer ? G.opts : [], word: reveal ? G.word : '',
      hint: G.word ? mask(G.word, G.rev) : '', guessed: G.guessed };
  };
  const bc = () => { Object.keys(R.conns).forEach((id) => send(id, { t: 's', s: viewOf(id) })); setV(viewOf('host')); };
  const say = (text: string, n: string | null, sys = false) => { R.G.chat = [...R.G.chat.slice(-60), { text, n, sys }]; };
  const hostOp = (m: DrawMsg) => { op(m); Object.keys(R.conns).forEach((id) => send(id, m)); };

  const nextTurn = (): void => {
    const G = R.G; G.turn++;
    if (G.turn >= G.order.length) { G.turn = 0; G.round++; G.order = G.players.map((p) => p.id); }
    if (G.round > G.rounds || !G.order.length) { G.phase = 'end'; G.time = 0; return bc(); }
    G.drawer = G.order[G.turn];
    if (!G.players.find((p) => p.id === G.drawer)) return nextTurn();
    G.phase = 'choosing'; G.time = 15; G.word = ''; G.rev = []; G.guessed = {};
    G.opts = [pick(WORDS), pick(WORDS), pick(WORDS)];
    hostOp({ t: 'clr' }); bc();
  };
  const pickWord = (w: string) => { const G = R.G; G.word = w; G.phase = 'drawing'; G.time = 80; G.rev = []; bc(); };
  const endTurn = () => { const G = R.G; G.phase = 'reveal'; G.time = 5; say(`The word was "${G.word}"`, null, true); bc(); };
  const tick = () => {
    const G = R.G; if (!['choosing', 'drawing', 'reveal'].includes(G.phase)) return;
    G.time--;
    if (G.phase === 'choosing' && G.time <= 0) return pickWord(G.opts[0]);
    if (G.phase === 'drawing') {
      if ([50, 30, 15].includes(G.time)) {
        const idx = G.word.split('').map((_, i) => i).filter((i) => G.word[i] !== ' ' && !G.rev.includes(i));
        if (idx.length > 1) G.rev.push(pick(idx));
      }
      if (G.time <= 0) return endTurn();
    }
    if (G.phase === 'reveal' && G.time <= 0) return nextTurn();
    bc();
  };
  const drop = (id: string) => {
    const G = R.G; delete R.conns[id];
    const p = G.players.find((q) => q.id === id);
    G.players = G.players.filter((q) => q.id !== id);
    if (p) say(`${p.name} left`, null, true);
    if (G.phase === 'drawing' && G.drawer === id) endTurn();
    else if (G.phase === 'choosing' && G.drawer === id) nextTurn();
    else bc();
  };
  const handle = (id: string, m: ClientMsg) => {
    const G = R.G;
    if (m.t === 'join') {
      if (G.players.length >= 12) return;
      const n = (m.name || 'Player').slice(0, 14);
      G.players.push({ id, name: n, score: 0 });
      send(id, { t: 'full', segs: R.segs }); say(`${n} joined`, null, true); bc();
    } else if (m.t === 'start') {
      if (id !== 'host' || (G.phase !== 'lobby' && G.phase !== 'end')) return;
      G.rounds = m.rounds || 3; G.players.forEach((p) => (p.score = 0));
      G.round = 1; G.turn = -1; G.order = G.players.map((p) => p.id); nextTurn();
    } else if (m.t === 'pick') {
      if (id === G.drawer && G.phase === 'choosing') pickWord(m.w);
    } else if (m.t === 'seg' || m.t === 'clr' || m.t === 'undo') {
      if (id !== G.drawer || G.phase !== 'drawing') return;
      op(m); Object.keys(R.conns).forEach((c) => c !== id && send(c, m));
    } else if (m.t === 'guess') {
      const p = G.players.find((q) => q.id === id); const g = m.text.trim().slice(0, 60);
      if (!p || !g) return;
      if (G.phase === 'drawing' && id !== G.drawer && !G.guessed[id] && g.toLowerCase() === G.word.toLowerCase()) {
        G.guessed[id] = 1; p.score += 50 + G.time * 4;
        const d = G.players.find((q) => q.id === G.drawer); if (d) d.score += 40;
        say(`${p.name} guessed the word!`, null, true);
        if (G.players.filter((q) => q.id !== G.drawer).every((q) => G.guessed[q.id])) return endTurn();
        bc();
      } else if (G.guessed[id] || (id === G.drawer && G.phase === 'drawing')) {
        /* guessers and the drawer can't chat during a round, so the word can't leak */
      } else { say(g, p.name); bc(); }
    }
  };

  /** Single entry point for UI actions: host handles locally, guests send to the host. */
  const net = (m: ClientMsg) => {
    if (R.host) return handle('host', m);
    if (m.t === 'seg' || m.t === 'clr' || m.t === 'undo') op(m);
    R.conn?.send(m);
  };

  // ---------- connect ----------
  const create = async (name: string, tries = 0): Promise<void> => {
    if (!name.trim()) return setErr('Enter a nickname');
    const { Peer } = await import('peerjs');
    const c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
    const peer = new Peer('doodle-' + c); R.peer = peer;
    peer.on('error', (e) => (e.type === 'unavailable-id' && tries < 5 ? create(name, tries + 1) : setErr('Connection error: ' + e.type)));
    peer.on('open', () => {
      R.host = true; R.code = c; R.G = blank(name.trim().slice(0, 14));
      peer.on('connection', (conn) => {
        conn.on('open', () => { R.conns[conn.peer] = conn; });
        conn.on('data', (m) => handle(conn.peer, m as ClientMsg));
        conn.on('close', () => drop(conn.peer));
      });
      R.timer = setInterval(tick, 1000); setScreen('game'); bc();
    });
  };
  const join = async (name: string, code: string) => {
    if (!name.trim() || code.length < 4) return setErr('Enter a nickname and a 4-letter room code');
    const { Peer } = await import('peerjs');
    const peer = new Peer(); R.peer = peer;
    peer.on('error', (e) => setErr(e.type === 'peer-unavailable' ? 'Room not found' : 'Connection error: ' + e.type));
    peer.on('open', () => {
      const conn = peer.connect('doodle-' + code.toUpperCase(), { reliable: true });
      R.conn = conn; R.code = code.toUpperCase();
      conn.on('open', () => { conn.send({ t: 'join', name: name.trim() } satisfies ClientMsg); setErr(''); setScreen('game'); });
      conn.on('data', (m) => { const h = m as HostMsg; if (h.t === 's') setV(h.s); else op(h); });
      conn.on('close', () => { setErr('Disconnected from host'); setScreen('home'); setV(null); });
    });
  };

  useEffect(() => { redraw(); }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (R.timer) clearInterval(R.timer); R.peer?.destroy(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { screen, err, v, cv, code: R.code, isHost: R.host, create, join, net };
}
