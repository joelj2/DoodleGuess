import { H, W, type Fill } from './types';

/** Scanline-free flood fill on the canvas pixels. Deterministic, so every player gets the same result. */
export function flood(x: CanvasRenderingContext2D, m: Fill) {
  const img = x.getImageData(0, 0, W, H), d = img.data;
  const sx = Math.min(W - 1, Math.max(0, Math.floor(m.a[0] * W)));
  const sy = Math.min(H - 1, Math.max(0, Math.floor(m.a[1] * H)));
  const i0 = (sy * W + sx) * 4, tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
  const n = parseInt(m.c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (tr === r && tg === g && tb === b) return;
  const seen = new Uint8Array(W * H), st = [sy * W + sx];
  while (st.length) {
    const p = st.pop()!; if (seen[p]) continue; seen[p] = 1;
    const i = p * 4;
    if (Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) > 110) continue;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    const px = p % W;
    if (px > 0) st.push(p - 1);
    if (px < W - 1) st.push(p + 1);
    if (p >= W) st.push(p - W);
    if (p < W * (H - 1)) st.push(p + W);
  }
  x.putImageData(img, 0, 0);
}
