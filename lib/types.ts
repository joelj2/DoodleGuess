export const W = 1000;
export const H = 700;

export type Phase = 'lobby' | 'choosing' | 'drawing' | 'reveal' | 'end';
export type Pt = [number, number];

export interface Player { id: string; name: string; score: number }
export interface ChatMsg { text: string; n?: string | null; sys?: boolean; ok?: boolean; to?: string }
export interface Seg { t: 'seg'; k: string; c: string; w: number; a: Pt; b: Pt }
export interface Fill { t: 'fill'; k: string; c: string; a: Pt }
export type Stroke = Seg | Fill;

export type DrawMsg = Stroke | { t: 'clr' } | { t: 'undo' } | { t: 'full'; segs: Stroke[] };
export type ClientMsg =
  | DrawMsg
  | { t: 'join'; name: string }
  | { t: 'start'; rounds: number }
  | { t: 'pick'; w: string }
  | { t: 'guess'; text: string };
export const isDraw = (m: ClientMsg): m is Exclude<DrawMsg, { t: 'full' }> =>
  m.t === 'seg' || m.t === 'fill' || m.t === 'clr' || m.t === 'undo';

/** What each player is allowed to see (the word is only sent to the drawer). */
export interface View {
  me: string; players: Player[]; phase: Phase; round: number; rounds: number;
  drawer: string | null; time: number; chat: ChatMsg[]; opts: string[];
  word: string; hint: string; guessed: Record<string, number>; gain: Record<string, number>;
}
export type HostMsg = { t: 's'; s: View } | DrawMsg;

/** Full authoritative state, kept only in the host's browser. */
export interface GameState {
  players: Player[]; phase: Phase; round: number; rounds: number; order: string[]; turn: number;
  drawer: string | null; word: string; rev: number[]; opts: string[]; time: number;
  chat: ChatMsg[]; guessed: Record<string, number>; gain: Record<string, number>;
}
