'use client';
import { useEffect, useRef, useState } from 'react';
import type { MediaConnection, Peer } from 'peerjs';
import type { Player } from './types';

interface Link { call: MediaConnection; audio: HTMLAudioElement }

/**
 * Peer-to-peer voice chat (mesh).
 * - Every pair of players gets exactly ONE call from the start, always placed by the player with the smaller
 *   peer id (no "both call each other" clashes). Calls begin with a silent track, so everyone can hear
 *   straight away without a microphone.
 * - Pressing the mic button asks for permission and swaps the silent track for the real mic (replaceTrack,
 *   no renegotiation needed). `forceMute` silences the current drawer.
 */
export function useVoice(peer: Peer | null, players: Player[], forceMute: boolean) {
  const [on, setOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [talking, setTalking] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState('');
  const mic = useRef<MediaStream | null>(null);
  const silent = useRef<MediaStream | null>(null);
  const links = useRef<Record<string, Link>>({});
  const meters = useRef<Record<string, AnalyserNode>>({});
  const ac = useRef<AudioContext | null>(null);
  const plist = useRef(players);
  plist.current = players;
  const key = players.map((p) => p.pid).join(',');

  const ctx = () => (ac.current ??= new AudioContext());
  const out = () => {
    if (mic.current) return mic.current;
    if (!silent.current) silent.current = ctx().createMediaStreamDestination().stream;
    return silent.current;
  };
  const meter = (id: string, s: MediaStream) => {
    try { const an = ctx().createAnalyser(); an.fftSize = 512; ctx().createMediaStreamSource(s).connect(an); meters.current[id] = an; }
    catch { /* meters are optional */ }
  };
  const attach = (pid: string, call: MediaConnection) => {
    links.current[pid]?.call.close();
    const audio = new Audio(); audio.autoplay = true;
    const link: Link = { call, audio };
    links.current[pid] = link;
    const drop = () => { audio.srcObject = null; if (links.current[pid] === link) { delete links.current[pid]; delete meters.current[pid]; } };
    call.on('stream', (s) => { audio.srcObject = s; audio.play().catch(() => {}); meter(pid, s); });
    call.on('close', drop);
    call.on('error', drop);
  };
  /** Call every player with a bigger peer id; hang up on anyone who left. Safe to run repeatedly. */
  const ensure = () => {
    if (!peer) return;
    Object.keys(links.current).forEach((id) => {
      if (!plist.current.some((p) => p.pid === id)) { links.current[id].call.close(); delete links.current[id]; }
    });
    plist.current.forEach((p) => {
      if (!p.pid || p.pid === peer.id || links.current[p.pid] || peer.id > p.pid) return;
      attach(p.pid, peer.call(p.pid, out()));
    });
  };

  useEffect(() => {
    if (!peer) return;
    const h = (call: MediaConnection) => { call.answer(out()); attach(call.peer, call); };
    peer.on('call', h);
    return () => { peer.off('call', h); };
  }, [peer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ensure(); const t = setInterval(ensure, 4000); // the interval retries calls that failed
    return () => clearInterval(t);
  }, [peer, key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { mic.current?.getAudioTracks().forEach((t) => { t.enabled = !muted && !forceMute; }); }, [muted, forceMute, on]);

  useEffect(() => { // browsers keep audio suspended until the first tap
    const r = () => { ac.current?.resume().catch(() => {}); };
    window.addEventListener('pointerdown', r);
    const buf = new Uint8Array(512);
    const t = setInterval(() => {
      const next: Record<string, boolean> = {};
      for (const [k, an] of Object.entries(meters.current)) {
        an.getByteTimeDomainData(buf);
        let max = 0; for (const b of buf) max = Math.max(max, Math.abs(b - 128));
        next[k] = max > 6;
      }
      setTalking((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, 200);
    return () => { window.removeEventListener('pointerdown', r); clearInterval(t); };
  }, []);

  useEffect(() => () => {
    mic.current?.getTracks().forEach((t) => t.stop());
    Object.values(links.current).forEach((l) => l.call.close());
    ac.current?.close().catch(() => {});
  }, []);

  const join = async () => {
    try {
      ctx().resume().catch(() => {});
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const track = s.getAudioTracks()[0];
      mic.current = s;
      Object.values(links.current).forEach((l) => {
        l.call.peerConnection.getSenders().find((x) => x.track?.kind === 'audio')?.replaceTrack(track).catch(() => {});
      });
      meter(peer?.id ?? 'me', s); setMuted(false); setErr(''); setOn(true);
    } catch {
      setErr('Microphone blocked. Allow it in your browser settings and try again.'); setTimeout(() => setErr(''), 5000);
    }
  };
  const toggle = () => (on ? setMuted((m) => !m) : join());
  return { on, muted, talking, err, toggle };
}
