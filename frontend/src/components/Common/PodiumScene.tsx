import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import { girl, type Palette, pDance, rc, readPalette } from "./Mascot"

type Ctx = CanvasRenderingContext2D

const SW = 150
const SH = 100
const SG = 92
const FRAME_MS = 42

const NEON = {
  pink: "#ff4fd8",
  violet: "#8b5cff",
  cyan: "#4cc9f0",
  truss: "#cfd9e4",
  trussD: "#7d8aa3",
  pad: "#0b0a14",
}

const BG_BANDS = ["#080719", "#0b0a24", "#0e0d2e", "#121038"]
const DIGIT_ONE = [
  "..#..",
  ".##..",
  "..#..",
  "..#..",
  "..#..",
  "..#..",
  ".###.",
]

const FONT: Record<string, string[]> = {
  N: ["#.#", "###", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..#", "..#", "..#", "#.#", "###"],
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  C: ["###", "#..", "#..", "#..", "###"],
  L: ["#..", "#..", "#..", "#..", "###"],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  " ": ["...", "...", "...", "...", "..."],
}

interface ArenaOpts {
  W: number
  H: number
  gy: number
  scroll: number
  t: number
}

// Псевдослучайное число в [0, 1) по целому n
function hs(n: number): number {
  let x = n ^ 61 ^ (n >>> 16)
  x = x + (x << 3)
  x = x ^ (x >>> 4)
  x = Math.imul(x, 0x27d4eb2d)
  x = x ^ (x >>> 15)
  return (x >>> 0) / 4294967296
}

function mod(a: number, b: number): number {
  return ((a % b) + b) % b
}

function annulus(
  c: Ctx,
  cx: number,
  cy: number,
  r1: number,
  r2: number,
  col: string,
) {
  c.fillStyle = col
  for (let dy = -Math.ceil(r2); dy <= Math.ceil(r2); dy++) {
    if (r2 * r2 - dy * dy < 0) continue
    const w2 = Math.floor(Math.sqrt(r2 * r2 - dy * dy + 0.5))
    if (dy * dy < r1 * r1) {
      const w1 = Math.floor(Math.sqrt(r1 * r1 - dy * dy + 0.5))
      c.fillRect(cx - w2, cy + dy, w2 - w1, 1)
      c.fillRect(cx + w1 + 1, cy + dy, w2 - w1, 1)
    } else {
      c.fillRect(cx - w2, cy + dy, 2 * w2 + 1, 1)
    }
  }
}

function trussPost(c: Ctx, x: number, y0: number, y1: number, w = 5) {
  rc(c, x, y0, 1, y1 - y0, NEON.truss)
  rc(c, x + w - 1, y0, 1, y1 - y0, NEON.truss)
  c.fillStyle = NEON.trussD
  for (let y = y0; y < y1; y += w - 1) {
    for (let k = 0; k < w - 1 && y + k < y1; k++) {
      c.fillRect(x + k, y + k, 1, 1)
      c.fillRect(x + w - 1 - k, y + k, 1, 1)
    }
  }
}

function trussBeam(
  c: Ctx,
  x0: number,
  x1: number,
  y: number,
  off: number,
  h = 5,
) {
  rc(c, x0, y, x1 - x0, 1, NEON.truss)
  rc(c, x0, y + h, x1 - x0, 1, NEON.truss)
  c.fillStyle = NEON.trussD
  const p = h * 2
  for (let x = x0 - mod(off, p); x < x1; x += p) {
    for (let k = 0; k <= h; k++) {
      for (const px of [x + k, x + p - k]) {
        if (px >= x0 && px < x1) c.fillRect(px, y + k, 1, 1)
      }
    }
  }
}

function text(c: Ctx, s: string, x: number, y: number, k: number) {
  ;[...s].forEach((ch, n) => {
    ;(FONT[ch] ?? FONT[" "]).forEach((row, j) => {
      ;[...row].forEach((v, i) => {
        if (v === "#") c.fillRect(x + n * 4 * k + i * k, y + j * k, k, k)
      })
    })
  })
}

function ledWall(
  c: Ctx,
  W: number,
  y0: number,
  y1: number,
  sc: number,
  t: number,
) {
  rc(c, 0, y0, W, y1 - y0, "#121748")
  // Небоскрёбы с неоновым контуром и окнами
  for (let i = Math.floor(sc / 10) - 1; i * 10 - sc < W; i++) {
    const bx = Math.round(i * 10 - sc)
    const h = 12 + Math.floor(hs(i) * (y1 - y0 - 22))
    const top = y1 - h
    const col = [NEON.cyan, NEON.pink, NEON.violet][Math.floor(hs(i + 99) * 3)]
    rc(c, bx, top, 8, h, "#0c1034")
    rc(c, bx, top, 8, 1, col)
    rc(c, bx, top, 1, h, col)
    rc(c, bx + 7, top, 1, h, col)
    for (let r = 0; r < h - 4; r += 4) {
      for (let q = 0; q < 2; q++) {
        const k = hs(i * 31 + r * 7 + q)
        if (k > 0.55 && (k < 0.8 || Math.floor(t * 2 + i) % 3)) {
          rc(c, bx + 2 + q * 3, top + 3 + r, 2, 2, k > 0.9 ? "#fff" : col)
        }
      }
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

function chevrons(c: Ctx, W: number, y: number, h: number, off: number) {
  const per = 24
  const half = Math.ceil(h / 2)
  for (let i = Math.floor(off / per) - 1; i * per - off < W; i++) {
    const x = Math.round(i * per - off)
    const col = i % 2 ? NEON.cyan : NEON.pink
    for (let k = 0; k < half; k++) {
      rc(c, x + k, y + k, 2, 1, col)
      rc(c, x + k, y + h - 1 - k, 2, 1, col)
    }
  }
}

function crowd(c: Ctx, y: number, W: number, sc: number) {
  const tones = ["#2a2150", "#3b2a63", "#1d3a5c", "#4a2a4f"]
  for (let i = Math.floor(sc / 6) - 1; i * 6 - sc < W; i++) {
    const x = Math.round(i * 6 - sc)
    const k = hs(i + 5)
    rc(c, x, y + 3, 5, 6, tones[Math.floor(k * 4)])
    rc(c, x + 1, y, 3, 3, "#8a6f7a")
    if (k > 0.8) rc(c, x - 1, y + 1, 1, 3, "#8a6f7a")
    if (k > 0.92) rc(c, x + 5, y - 2, 1, 4, NEON.cyan)
  }
}

// Неоновая арена: фермы, LED-экран с городом, зрители, маты, шевроны
function arena(c: Ctx, o: ArenaOpts) {
  const { W, H, gy, scroll: s, t } = o
  const wy0 = Math.round(gy * 0.22)
  const wy1 = gy - 12

  for (const [i, col] of BG_BANDS.entries()) {
    rc(c, 0, Math.floor((i * gy) / 4), W, Math.ceil(gy / 4) + 1, col)
  }

  // Лучи прожекторов
  const lights: [number, string, number][] = []
  for (let i = Math.floor((s * 0.5) / 70) - 1; i * 70 - s * 0.5 < W + 40; i++) {
    lights.push([
      Math.round(i * 70 - s * 0.5 + 20),
      hs(i + 7) > 0.5 ? NEON.pink : NEON.cyan,
      (hs(i + 3) - 0.5) * 0.6,
    ])
  }
  c.globalAlpha = 0.07
  for (const [x, col, dir] of lights) {
    c.fillStyle = col
    for (let j = 8; j < gy; j++) {
      c.fillRect(
        Math.round(x + dir * (j - 8) - 2 - j * 0.12),
        j,
        Math.round(4 + j * 0.24),
        1,
      )
    }
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

  // Висящие неоновые кольца-декор
  for (
    let i = Math.floor((s * 0.5) / 120) - 1;
    i * 120 - s * 0.5 < W + 10;
    i++
  ) {
    const x = Math.round(i * 120 - s * 0.5 + 60)
    const y = 20 + Math.floor(hs(i) * 8)
    rc(c, x, 6, 1, y - 11, NEON.trussD)
    c.globalAlpha = 0.6
    annulus(c, x, y, 3.5, 5, i % 2 ? NEON.pink : NEON.cyan)
    c.globalAlpha = 1
  }

  for (
    let i = Math.floor((s * 0.6) / 150) - 1;
    i * 150 - s * 0.6 < W + 10;
    i++
  ) {
    trussPost(c, Math.round(i * 150 - s * 0.6 + 40), 5, gy)
  }

  rc(c, 0, gy, W, 3, NEON.pad)
  rc(c, 0, gy, W, 1, NEON.pink)
  c.globalAlpha = 0.25
  rc(c, 0, gy - 1, W, 1, NEON.pink)
  c.globalAlpha = 1

  // Лицевая панель платформы с шевронами
  const ph = H - gy - 3
  rc(c, 0, gy + 3, W, ph, "#14102e")
  for (let i = Math.floor(s / 70) - 1; i * 70 - s < W; i++) {
    rc(c, Math.round(i * 70 - s), gy + 3, 1, ph, NEON.pad)
  }
  const ch = Math.min(9, ph - 3)
  chevrons(c, W, gy + 3 + Math.floor((ph - ch) / 2), ch, s)
}

function confetti(c: Ctx, P: Palette, t: number) {
  const cols = [P.fire, P.lime, P.steel]
  for (let i = 0; i < 14; i++) {
    rc(
      c,
      ((i * 13 + 7) % SW) + Math.sin(t * 3 + i) * 3,
      ((t * (30 + (i % 3) * 10) + i * 17) % (SH + 10)) - 5,
      2,
      2,
      cols[i % 3],
    )
  }
}

function drawPodium(c: Ctx, P: Palette, t: number, boy: boolean) {
  arena(c, { W: SW, H: SH, gy: SG, scroll: t * 14, t })
  rc(c, 50, SG - 14, 50, 14, P.out)
  rc(c, 51, SG - 13, 48, 13, "#1a1550")
  rc(c, 51, SG - 13, 48, 1, NEON.cyan)
  rc(c, 51, SG - 1, 48, 1, NEON.pink)
  DIGIT_ONE.forEach((r, j) => {
    ;[...r].forEach((ch, i) => {
      if (ch === "#") rc(c, 73 + i, SG - 11 + j, 1, 1, "#fff")
    })
  })
  girl(c, P, pDance(t, 75, SG - 14), t, boy)
  confetti(c, P, t)
}

export function PodiumScene({
  className,
  label,
  boy = false,
}: {
  className?: string
  label?: string
  boy?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const c = canvas?.getContext("2d")
    if (!canvas || !c) return

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let last = Number.NEGATIVE_INFINITY

    const frame = (ms: number) => {
      if (ms - last >= FRAME_MS) {
        last = ms
        const P = readPalette(document.documentElement)
        c.clearRect(0, 0, SW, SH)
        drawPodium(c, P, reduced ? 1.3 : ms / 1000, boy)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => cancelAnimationFrame(raf)
  }, [boy])

  return (
    <canvas
      ref={ref}
      width={SW}
      height={SH}
      role="img"
      aria-label={label}
      className={cn("px", className)}
    />
  )
}
