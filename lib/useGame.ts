'use client';
import { useEffect, useRef, useState } from 'react';
import type { DataConnection, Peer } from 'peerjs';
import { ClientMsg, DrawMsg, GameState, H, HostMsg, Stroke, View, W, isDraw } from './types';
import { WORDS, mask, near, pick } from './words';
import { flood } from './flood';

interface Room {
  conns: Record<string, DataConnection>; conn: DataConnection | null; peer: Peer | null;
  segs: Stroke[]; G: GameState; host: boolean; code: string; timer: ReturnType<typeof setInterval> | null;
}
const blank = (name = ''): GameState => ({
  players: name ? [{ id: 'host', pid: '', name, score: 0 }] : [], phase: 'lobby', round: 0, rounds: 3,
  order: [], turn: 0, drawer: null, word: '', rev: [], opts: [], time: 0, chat: [], guessed: {}, gain: {},
});

// Optional TURN relay (set NEXT_PUBLIC_TURN_USER / NEXT_PUBLIC_TURN_PASS in Vercel) for strict networks / mobile data.
const user = process.env.NEXT_PUBLIC_TURN_USER, pass = process.env.NEXT_PUBLIC_TURN_PASS;
const ICE = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  ...(user && pass ? ['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:443', 'turns:global.relay.metered.ca:443?transport=tcp']
    .map((urls) => ({ urls, username: user, credential: pass })) : []),
] };

export function useGame() {
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [err, setErr] = useState('');
  const [v, setV] = useState<View | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const R = useRef<Room>({ conns: {}, conn: null, peer: null, segs: [], G: blank(), host: false, code: '', timer: null }).current;

  // ---------- canvas ----------
  const ctx = () => cv.current?.getContext('2d', { willReadFrequently: true }) ?? null;
  const paint = (m: Stroke) => {
    const x = ctx(); if (!x) return;
    if (m.t === 'fill') return flood(x, m);
    x.strokeStyle = m.c; x.lineWidth = m.w; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(m.a[0] * W, m.a[1] * H); x.lineTo(m.b[0] * W + 0.01, m.b[1] * H); x.stroke();
  };
  const redraw = () => { const x = ctx(); if (!x) return; x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); R.segs.forEach(paint); };
  const op = (m: DrawMsg) => {
    if (m.t === 'seg' || m.t === 'fill') { R.segs.push(m); paint(m); }
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
      chat: G.chat.filter((m) => !m.to || m.to === id), opts: id === G.drawer ? G.opts : [], word: reveal ? G.word : '',
      hint: G.word ? mask(G.word, G.rev) : '', guessed: G.guessed, gain: G.gain };
  };
  const bc = () => { Object.keys(R.conns).forEach((id) => send(id, { t: 's', s: viewOf(id) })); setV(viewOf('host')); };
  const say = (text: string, n: string | null, sys = false, extra: Partial<GameState['chat'][number]> = {}) => {
    R.G.chat = [...R.G.chat.slice(-80), { text, n, sys, ...extra }];
  };
  const hostOp = (m: DrawMsg) => { op(m); Object.keys(R.conns).forEach((id) => send(id, m)); };

  const nextTurn = (): void => {
    const G = R.G; G.turn++;
    if (G.turn >= G.order.length) { G.turn = 0; G.round++; G.order = G.players.map((p) => p.id); }
    if (G.round > G.rounds || !G.order.length) { G.phase = 'end'; G.time = 0; return bc(); }
    G.drawer = G.order[G.turn];
    if (!G.players.find((p) => p.id === G.drawer)) return nextTurn();
    G.phase = 'choosing'; G.time = 15; G.word = ''; G.rev = []; G.guessed = {}; G.gain = {};
    G.opts = [pick(WORDS), pick(WORDS), pick(WORDS)];
    hostOp({ t: 'clr' }); bc();
  };
  const pickWord = (w: string) => { const G = R.G; G.word = w; G.phase = 'drawing'; G.time = 80; G.rev = []; bc(); };
  const endTurn = () => { const G = R.G; G.phase = 'reveal'; G.time = 6; say(`The word was "${G.word}"`, null, true); bc(); };
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
  const award = (id: string, pts: number) => {
    const p = R.G.players.find((q) => q.id === id); if (!p) return;
    p.score += pts; R.G.gain[id] = (R.G.gain[id] || 0) + pts;
  };
  const handle = (id: string, m: ClientMsg) => {
    const G = R.G;
    if (m.t === 'join') {
      if (G.players.length >= 12) return;
      const n = (m.name || 'Player').slice(0, 14);
      G.players.push({ id, pid: id, name: n, score: 0 });
      send(id, { t: 'full', segs: R.segs }); say(`${n} joined the room`, null, true); bc();
    } else if (m.t === 'start') {
      if (id !== 'host' || (G.phase !== 'lobby' && G.phase !== 'end')) return;
      G.rounds = m.rounds || 3; G.players.forEach((p) => (p.score = 0));
      G.round = 1; G.turn = -1; G.order = G.players.map((p) => p.id); nextTurn();
    } else if (m.t === 'pick') {
      if (id === G.drawer && G.phase === 'choosing') pickWord(m.w);
    } else if (isDraw(m)) {
      if (id !== G.drawer || G.phase !== 'drawing') return;
      op(m); Object.keys(R.conns).forEach((c) => c !== id && send(c, m));
    } else if (m.t === 'guess') {
      const p = G.players.find((q) => q.id === id); const g = m.text.trim().slice(0, 60);
      if (!p || !g) return;
      const live = G.phase === 'drawing' && id !== G.drawer && !G.guessed[id];
      if (live && g.toLowerCase() === G.word.toLowerCase()) {
        G.guessed[id] = 1; award(id, 50 + G.time * 4); award(G.drawer ?? '', 40);
        say(`${p.name} guessed the word!`, null, true, { ok: true });
        if (G.players.filter((q) => q.id !== G.drawer).every((q) => G.guessed[q.id])) return endTurn();
        bc();
      } else if (G.guessed[id] || (id === G.drawer && G.phase === 'drawing')) {
        /* guessers and the drawer can't chat during a round, so the word can't leak */
      } else {
        say(g, p.name);
        if (live && near(g.toLowerCase(), G.word.toLowerCase())) say(`"${g}" is close!`, null, true, { to: id });
        bc();
      }
    }
  };

  /** Single entry point for UI actions: host handles locally, guests send to the host. */
  const net = (m: ClientMsg) => {
    if (R.host) return handle('host', m);
    if (isDraw(m)) op(m);
    R.conn?.send(m);
  };

  // ---------- connect ----------
  const create = async (name: string, tries = 0): Promise<void> => {
    if (!name.trim()) return setErr('Enter a nickname');
    const { Peer } = await import('peerjs');
    const c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
    const peer = new Peer('doodle-' + c, { config: ICE }); R.peer = peer;
    peer.on('error', (e) => (e.type === 'unavailable-id' && tries < 5 ? create(name, tries + 1) : setErr('Connection error: ' + e.type)));
    peer.on('open', () => {
      R.host = true; R.code = c; R.G = blank(name.trim().slice(0, 14)); R.G.players[0].pid = peer.id; setPeer(peer);
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
    const peer = new Peer({ config: ICE }); R.peer = peer;
    peer.on('error', (e) => setErr(e.type === 'peer-unavailable' ? 'Room not found' : 'Connection error: ' + e.type));
    peer.on('open', () => {
      setPeer(peer);
      const conn = peer.connect('doodle-' + code.toUpperCase(), { reliable: true });
      R.conn = conn; R.code = code.toUpperCase();
      conn.on('open', () => { conn.send({ t: 'join', name: name.trim() } satisfies ClientMsg); setErr(''); setScreen('game'); });
      conn.on('data', (m) => { const h = m as HostMsg; if (h.t === 's') setV(h.s); else op(h); });
      conn.on('close', () => { setErr('Disconnected from host'); setScreen('home'); setV(null); });
    });
  };

  useEffect(() => { redraw(); }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (R.timer) clearInterval(R.timer); R.peer?.destroy(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { screen, err, v, peer, cv, code: R.code, isHost: R.host, create, join, net };
}
