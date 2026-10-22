import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

type Ctx = CanvasRenderingContext2D
type Pt = [number, number]

interface Palette {
  out: string
  tee: string
  teeHi: string
  legs: string
  legsHi: string
  skin: string
  skin2: string
  hair: string
  hair2: string
  white: string
  blush: string
  shoeAcc: string
  wristL: string
  wristR: string
  lime: string
}

interface Pose {
  hip: Pt
  hl: Pt
  hr: Pt
  fl: Pt
  fr: Pt
  eye: number
  mouth: number
  hd: Pt
  flow: number
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const mix = (a: Pt, b: Pt, w: number): Pt => [
  a[0] + (b[0] - a[0]) * w,
  a[1] + (b[1] - a[1]) * w,
]
const blink = (t: number) => t % 3.7 < 0.14

function readPalette(el: HTMLElement): Palette {
  const s = getComputedStyle(el)
  return {
    lime: s.getPropertyValue("--nk-lime").trim() || "#c6ff3d",
    out: "#0a0812",
    tee: "#262a34",
    teeHi: "#454b5a",
    legs: "#232730",
    legsHi: "#40465a",
    skin: "#f6d0b4",
    skin2: "#e0a98a",
    hair: "#c9a266",
    hair2: "#a07a44",
    white: "#f4f6fa",
    blush: "#f19a9f",
    shoeAcc: "#ff9fcf",
    wristL: "#ff3b3b",
    wristR: "#5a8fd6",
  }
}

function rc(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col
  c.fillRect(Math.round(x), Math.round(y), w, h)
}

function ln(c: Ctx, a: Pt, b: Pt, w: number, col: string) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])))
  const o = (w - 1) / 2
  c.fillStyle = col
  for (let i = 0; i <= n; i++) {
    c.fillRect(
      Math.round(a[0] + ((b[0] - a[0]) * i) / n - o),
      Math.round(a[1] + ((b[1] - a[1]) * i) / n - o),
      w,
      w,
    )
  }
}

function poly(c: Ctx, p: Pt[], w: number, col: string, out?: string) {
  if (out) {
    for (let i = 0; i < p.length - 1; i++) {
      ln(c, p[i], p[i + 1], w + 2, out)
    }
  }
  for (let i = 0; i < p.length - 1; i++) {
    ln(c, p[i], p[i + 1], w, col)
  }
}

// Инверсная кинематика двух костей: плечо/бедро s -> цель h
function ik(s: Pt, h: Pt, l1: number, l2: number, ox: number): [Pt, Pt] {
  let dx = h[0] - s[0]
  let dy = h[1] - s[1]
  let d = Math.hypot(dx, dy)
  const m = l1 + l2 - 0.3
  if (d > m) {
    dx *= m / d
    dy *= m / d
    d = m
  }
  d = Math.max(d, 1)
  const ux = dx / d
  const uy = dy / d
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const hh = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const mx = s[0] + ux * a
  const my = s[1] + uy * a
  const e1: Pt = [mx - uy * hh, my + ux * hh]
  const e2: Pt = [mx + uy * hh, my - ux * hh]
  const elbow = (e1[0] - s[0]) * ox > (e2[0] - s[0]) * ox ? e1 : e2
  return [elbow, [s[0] + dx, s[1] + dy]]
}

const EYES: [string, string][] = [
  ["ee", "eW"],
  ["ss", "ee"],
  ["se", "es"],
]

function headFront(e: number, m: boolean): string[] {
  const [e0, e1] = EYES[e] ?? ["ee", "eW"]
  return [
    "....oooo",
    "..ooHhhh",
    ".oHhhhhh",
    ".ohhhhhh",
    ".ohhhhss",
    ".ohhhsss",
    ".ohhssss",
    ".ohsssss",
    `.ohs${e0}ss`,
    `.ohs${e1}ss`,
    m ? ".ohpssss" : ".ohpsrss",
    m ? "..ohsRRR" : "..ohssrr",
    m ? "...odRRR" : "...odddd",
    "....oooo",
  ].map((r) => r + [...r].reverse().join(""))
}

function headSide(e: number, m: boolean): string[] {
  const [e0, e1] = EYES[e] ?? ["ee", "eW"]
  return [
    "....oooooooo....",
    "..ooHhhhhhhhoo..",
    ".oHhhhhhhhhhhHo.",
    ".ohhhhhhhhhhhho.",
    ".ohhhhhhhhhhsso.",
    ".ohhhhhhhhsssso.",
    ".ohhhhhhhssssso.",
    ".ohhhhsssssssso.",
    `.ohhhhssss${e0}sso.`,
    `.ohhhhssss${e1}sso.`,
    ".ohhhhsssppssso.",
    `..ohhhsssss${m ? "RR" : "rr"}so.`,
    "...ohhddddddddo.",
    "....oooooooooo..",
  ]
}

function drawHead(
  c: Ctx,
  P: Palette,
  x: number,
  y: number,
  e: number,
  m: boolean,
  side: boolean,
) {
  const col: Record<string, string> = {
    o: P.out,
    H: P.hair2,
    h: P.hair,
    s: P.skin,
    d: P.skin2,
    e: "#1b1424",
    W: "#fff",
    p: P.blush,
    r: "#c4505e",
    R: "#7a2230",
  }
  const rows = side ? headSide(e, m) : headFront(e, m)
  rows.forEach((r, j) => {
    for (let i = 0; i < 16; i++) {
      const ch = r[i]
      if (ch && ch !== ".") {
        c.fillStyle = col[ch] ?? "#000"
        c.fillRect(x + i, y + j, 1, 1)
      }
    }
  })
}

// Героиня: футболка с неоновым принтом, леггинсы, коса, браслеты, кроссовки
function girl(c: Ctx, P: Palette, p: Pose, t: number) {
  const [X, Y] = p.hip
  const fl = p.flow
  const O = P.out
  const br: Pt[] = [[X - 8, Y - 20]]
  let a = -0.35
  for (let i = 0; i < 9; i++) {
    a += Math.sin(t * 4.2 - i * 0.5) * 0.1 * fl
    const q = br[i]
    br.push([q[0] + Math.sin(a) * 2.3, q[1] + Math.cos(a) * 2.3])
  }
  poly(c, br, 3, P.hair, O)
  for (let i = 0; i < 9; i += 2) {
    ln(c, br[i], br[i + 1], 3, P.hair2)
  }
  for (const q of [br[0], br[9]]) {
    rc(c, q[0] - 2, q[1] - 2, 5, 5, O)
    rc(c, q[0] - 1, q[1] - 1, 3, 3, P.lime)
  }

  const leg = (k: number) => {
    const h: Pt = [X + (k ? 2 : -2), Y]
    const [kn, f] = ik(h, k ? p.fr : p.fl, 6, 6, k ? 1 : -1)
    ln(c, h, kn, 5, O)
    ln(c, kn, f, 5, O)
    ln(c, h, kn, 3, P.legs)
    ln(c, kn, f, 3, P.legs)
    ln(c, [h[0] + 1, h[1]], [kn[0] + 1, kn[1]], 1, P.legsHi)
    ln(c, [kn[0] + 1, kn[1]], [f[0] + 1, f[1]], 1, P.legsHi)
    rc(c, f[0] - 3, f[1] - 1, 8, 4, O)
    rc(c, f[0] - 2, f[1], 6, 2, P.white)
    rc(c, f[0] - 2, f[1] + 1, 6, 1, P.shoeAcc)
  }
  leg(0)
  leg(1)

  rc(c, X - 5, Y - 10, 10, 13, O)
  rc(c, X - 4, Y - 9, 8, 11, P.tee)
  rc(c, X - 4, Y - 9, 8, 1, P.teeHi)
  rc(c, X + 3, Y - 9, 1, 11, P.teeHi)
  rc(c, X - 3, Y - 6, 6, 2, P.lime)
  rc(c, X - 2, Y - 3, 4, 1, P.lime)
  rc(c, X - 2, Y - 10, 4, 2, P.skin)

  const arm = (k: number) => {
    const s: Pt = [X + (k ? 4 : -4), Y - 7]
    const [el, h] = ik(s, k ? p.hr : p.hl, 7, 7, k ? 1 : -1)
    ln(c, s, el, 5, O)
    ln(c, el, h, 5, O)
    ln(c, s, el, 3, P.skin)
    ln(c, el, h, 3, P.skin)
    ln(c, s, mix(s, el, 0.6), 3, P.tee)
    ln(c, mix(el, h, 0.55), mix(el, h, 0.8), 3, k ? P.wristR : P.wristL)
    rc(c, h[0] - 2, h[1] - 2, 5, 5, O)
    rc(c, h[0] - 1, h[1] - 1, 3, 3, P.skin)
  }
  arm(0)
  arm(1)

  const [hx, hy] = p.hd
  drawHead(
    c,
    P,
    Math.round(X - 8 + hx),
    Math.round(Y - 23 + hy),
    p.eye,
    p.mouth === 1,
    false,
  )
}

// Танцевальная поза на «площадке» с центром cx и уровнем земли gy
function pDance(t: number, cx: number, gy: number): Pose {
  const ph = t * 6.283
  const s = Math.sin(ph)
  const u = (s + 1) / 2
  const X = cx + s * 2
  const Y = gy - 15 - Math.abs(Math.sin(ph)) * 3
  const SY = Y - 7
  return {
    hip: [X, Y],
    hl: [X - 4 - lerp(8, 10, u), SY + lerp(6, -13, u)],
    hr: [X + 4 + lerp(8, 10, 1 - u), SY + lerp(6, -13, 1 - u)],
    fl: [cx - 4, gy - 3 - Math.max(0, s) * 4],
    fr: [cx + 4, gy - 3 - Math.max(0, -s) * 4],
    eye: blink(t) ? 1 : 2,
    mouth: 1,
    hd: [Math.round(s * 0.6), 0],
    flow: 1,
  }
}

function drawMascot(c: Ctx, P: Palette, t: number) {
  c.fillStyle = "rgba(0,0,0,.35)"
  c.fillRect(24, 59, 20, 2)
  c.fillRect(26, 61, 16, 1)
  girl(c, P, pDance(t, 34, 60), t)
}

const SIZE = 64
const FRAME_MS = 83

export function Mascot({ className }: { className?: string }) {
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
        const t = reduced ? 1.3 : ms / 1000
        c.clearRect(0, 0, SIZE, SIZE)
        drawMascot(c, P, t)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label="Талисман клуба: ниндзя-девочка танцует"
      className={cn("px nk-mascot", className)}
    />
  )
}
