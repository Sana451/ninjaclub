// pixel/arena.js — неоновая арена «как на съёмках»: фермы, LED-экран с городом и шевронами,
// зрители, чёрные маты, светящиеся кольца. Рисуется кодом, без картинок.
import { rc } from "./engine.js"

export const NEON = {
  pink: "#ff4fd8",
  violet: "#8b5cff",
  cyan: "#4cc9f0",
  truss: "#cfd9e4",
  trussD: "#7d8aa3",
  pad: "#0b0a14",
}
const hs = (n) => {
  let v = n ^ 61 ^ (n >>> 16)
  v = v + (v << 3)
  v = v ^ (v >>> 4)
  v = Math.imul(v, 0x27d4eb2d)
  v = v ^ (v >>> 15)
  return (v >>> 0) / 4294967296
}
const mod = (a, b) => ((a % b) + b) % b

// кольцо (окружность между радиусами r1 и r2) без заливки центра
export function annulus(c, cx, cy, r1, r2, col) {
  c.fillStyle = col
  for (let dy = -Math.ceil(r2); dy <= Math.ceil(r2); dy++) {
    if (r2 * r2 - dy * dy < 0) continue
    const w2 = Math.floor(Math.sqrt(r2 * r2 - dy * dy + 0.5))
    if (dy * dy < r1 * r1) {
      const w1 = Math.floor(Math.sqrt(r1 * r1 - dy * dy + 0.5))
      c.fillRect(cx - w2, cy + dy, w2 - w1, 1)
      c.fillRect(cx + w1 + 1, cy + dy, w2 - w1, 1)
    } else c.fillRect(cx - w2, cy + dy, 2 * w2 + 1, 1)
  }
}

/* Светящееся кольцо-награда: белая лицевая кромка, тонкий серый внутренний борт, холодное неоновое свечение
   (по фото: крупное белое кольцо на фоне неоновых колец). R — внешний радиус. */
export function drawRing(c, P, x0, y0, t, R = 9) {
  const x = Math.round(x0)
  const y = Math.round(y0 + Math.sin(t * 3 + x * 0.05) * 1.5)
  c.globalAlpha = 0.14 + 0.06 * Math.sin(t * 6)
  annulus(c, x, y, R - 1, R + 5, P.steel)
  c.globalAlpha = 0.3
  annulus(c, x, y, R - 1, R + 2, P.steel)
  c.globalAlpha = 1
  annulus(c, x, y, R - 2.5, R, "#f6fdff")
  annulus(c, x, y, R - 3.5, R - 2.5, "#8e99a8")
  c.fillStyle = "rgba(255,255,255,.9)"
  c.fillRect(x - Math.round(R * 0.5), y - R + 1, 3, 1)
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + (i * Math.PI) / 2
    const sx = Math.round(x + Math.cos(a) * (R + 4))
    const sy = Math.round(y + Math.sin(a) * (R + 4))
    c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8 + i * 1.7)
    c.fillStyle = "#ffffff"
    c.fillRect(sx, sy, 1, 1)
    c.fillRect(sx - 1, sy, 3, 1)
    c.fillRect(sx, sy - 1, 1, 3)
  }
  c.globalAlpha = 1
}

export function trussPost(c, x, y0, y1, w = 5) {
  rc(c, x, y0, 1, y1 - y0, NEON.truss)
  rc(c, x + w - 1, y0, 1, y1 - y0, NEON.truss)
  c.fillStyle = NEON.trussD
  for (let y = y0; y < y1; y += w - 1)
    for (let k = 0; k < w - 1 && y + k < y1; k++) {
      c.fillRect(x + k, y + k, 1, 1)
      c.fillRect(x + w - 1 - k, y + k, 1, 1)
    }
}
export function trussBeam(c, x0, x1, y, off, h = 5) {
  rc(c, x0, y, x1 - x0, 1, NEON.truss)
  rc(c, x0, y + h, x1 - x0, 1, NEON.truss)
  c.fillStyle = NEON.trussD
  const p = h * 2
  for (let x = x0 - mod(off, p); x < x1; x += p)
    for (let k = 0; k <= h; k++)
      for (const px of [x + k, x + p - k])
        if (px >= x0 && px < x1) c.fillRect(px, y + k, 1, 1)
}

const FONT = {
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..#", "..#", "..#", "#.#", "###"],
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  C: ["###", "#..", "#..", "#..", "###"],
  L: ["#..", "#..", "#..", "#..", "###"],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  " ": ["...", "...", "...", "...", "..."],
}
function text(c, s, x, y, k) {
  let cx = x
  for (const ch of s) {
    const g = FONT[ch] || FONT[" "]
    g.forEach((row, j) => {
      ;[...row].forEach((v, i) => {
        if (v === "#") c.fillRect(cx + i * k, y + j * k, k, k)
      })
    })
    cx += (g[0].length + 1) * k
  }
}

function ledWall(c, W, y0, y1, sc, t) {
  rc(c, 0, y0, W, y1 - y0, "#121748")
  for (let i = Math.floor(sc / 26) - 1; i * 26 - sc < W; i++) {
    // небоскрёбы с неоновым контуром и окнами; часть пропущена, чтобы между домами были просветы
    if (hs(i + 7) < 0.3) continue
    const bx = Math.round(i * 26 - sc),
      h = 12 + Math.floor(hs(i) * (y1 - y0 - 22)),
      top = y1 - h,
      col = [NEON.cyan, NEON.pink, NEON.violet][Math.floor(hs(i + 99) * 3)]
    rc(c, bx, top, 16, h, "#0c1034")
    rc(c, bx, top, 16, 1, col)
    rc(c, bx, top, 1, h, col)
    rc(c, bx + 15, top, 1, h, col)
    for (let r = 0; r < h - 4; r += 4)
      for (let q = 0; q < 3; q++) {
        const k = hs(i * 31 + r * 7 + q)
        if (k > 0.55 && (k < 0.8 || ((t * 2 + i) | 0) % 3))
          rc(c, bx + 3 + q * 5, top + 3 + r, 2, 2, k > 0.9 ? "#fff" : col)
      }
  }
  rc(c, 0, y0 - 1, W, 1, NEON.violet)
  rc(c, 0, y1, W, 1, NEON.cyan)
  const base = mod(sc, 360)
  for (const dx of [0, 360]) {
    const x = Math.round(70 + dx - base)
    if (x > W || x < -90) continue
    c.fillStyle = NEON.violet
    text(c, "NINJA CLUB", x + 1, y0 + 7, 2)
    c.fillStyle = "#fff"
    text(c, "NINJA CLUB", x, y0 + 6, 2)
  }
}
export function chevrons(c, W, y, h, off, per = 24) {
  const half = Math.ceil(h / 2)
  for (let i = Math.floor(off / per) - 1; i * per - off < W; i++) {
    const x = Math.round(i * per - off),
      col = i % 2 ? NEON.cyan : NEON.pink
    for (let k = 0; k < half; k++) {
      rc(c, x + k, y + k, 2, 1, col)
      rc(c, x + k, y + h - 1 - k, 2, 1, col)
    }
  }
}
function crowd(c, y, W, sc) {
  const tones = ["#2a2150", "#3b2a63", "#1d3a5c", "#4a2a4f"]
  for (let i = Math.floor(sc / 16) - 1; i * 16 - sc < W; i++) {
    const x = Math.round(i * 16 - sc),
      k = hs(i + 5)
    if (k < 0.25) continue
    rc(c, x, y + 3, 8, 6, tones[Math.floor(k * 4)])
    rc(c, x + 2, y, 4, 3, "#8a6f7a")
    if (k > 0.8) rc(c, x - 1, y + 1, 1, 3, "#8a6f7a")
    if (k > 0.92) rc(c, x + 7, y - 2, 1, 4, NEON.cyan)
  }
}

/* Вся арена: o = { W, H, gy (линия пола), scroll (px), t (сек) } */
export function arena(c, _P, o) {
  const { W, H, gy, scroll: s, t } = o,
    wy0 = Math.round(gy * 0.22),
    wy1 = gy - 12
  ;["#080719", "#0b0a24", "#0e0d2e", "#121038"].forEach((col, i) => {
    rc(c, 0, Math.floor((i * gy) / 4), W, Math.ceil(gy / 4) + 1, col)
  })
  const lights = []
  for (let i = Math.floor((s * 0.5) / 70) - 1; i * 70 - s * 0.5 < W + 40; i++)
    lights.push([
      Math.round(i * 70 - s * 0.5 + 20),
      hs(i + 7) > 0.5 ? NEON.pink : NEON.cyan,
      (hs(i + 3) - 0.5) * 0.6,
    ])
  c.globalAlpha = 0.07 // лучи прожекторов
  for (const [x, col, dir] of lights) {
    c.fillStyle = col
    for (let j = 8; j < gy; j++)
      c.fillRect(
        Math.round(x + dir * (j - 8) - 2 - j * 0.12),
        j,
        Math.round(4 + j * 0.24),
        1,
      )
  }
  c.globalAlpha = 1
  ledWall(c, W, wy0, wy1, s * 0.22, t)
  crowd(c, wy1 - 6, W, s * 0.4)
  rc(c, 0, wy1 + 3, W, gy - wy1 - 3, "#0d0b22")
  trussBeam(c, 0, W, 0, s * 0.5, 5)
  for (const [x, col] of lights) {
    rc(c, x - 3, 6, 6, 3, "#1b1b2e")
    rc(c, x - 1, 8, 2, 1, col)
  }
  for (
    let i = Math.floor((s * 0.5) / 120) - 1;
    i * 120 - s * 0.5 < W + 10;
    i++
  ) {
    // висящие неоновые кольца-декор
    const x = Math.round(i * 120 - s * 0.5 + 60),
      y = 20 + Math.floor(hs(i) * 8)
    rc(c, x, 6, 1, y - 11, NEON.trussD)
    c.globalAlpha = 0.6
    annulus(c, x, y, 3.5, 5, i % 2 ? NEON.pink : NEON.cyan)
    c.globalAlpha = 1
  }
  for (let i = Math.floor((s * 0.6) / 150) - 1; i * 150 - s * 0.6 < W + 10; i++)
    trussPost(c, Math.round(i * 150 - s * 0.6 + 40), 5, gy)
  rc(c, 0, gy, W, 3, NEON.pad)
  rc(c, 0, gy, W, 1, NEON.pink)
  c.globalAlpha = 0.25
  rc(c, 0, gy - 1, W, 1, NEON.pink)
  c.globalAlpha = 1
  const ph = H - gy - 3
  rc(c, 0, gy + 3, W, ph, "#14102e") // лицевая панель платформы с шевронами
  for (let i = Math.floor(s / 70) - 1; i * 70 - s < W; i++)
    rc(c, Math.round(i * 70 - s), gy + 3, 1, ph, NEON.pad)
  const ch = Math.min(9, ph - 3)
  chevrons(c, W, gy + 3 + Math.floor((ph - ch) / 2), ch, s, 48)
}
