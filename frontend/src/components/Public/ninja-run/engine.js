// pixel/engine.js — пиксель-арт героиня: палитра темы, примитивы, IK, рендер, общий «тикер».
// Без внешних ассетов: все кадры рисуются кодом (канвас), поэтому цвета следуют теме сайта.
export const lerp = (a, b, u) => a + (b - a) * u
const mix = (a, b, w) => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]
export const blink = (t) => t % 3.7 < 0.14
const _RM =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches

// цвета берутся из CSS-переменных активной темы --nk-*
export function palette() {
  const s = getComputedStyle(document.documentElement),
    g = (n) => s.getPropertyValue(n).trim()
  return {
    fire: g("--nk-fire"),
    lime: g("--nk-lime"),
    steel: g("--nk-steel"),
    bg: g("--nk-bg"),
    bg2: g("--nk-surface-2"),
    line: g("--nk-line"),
    muted: g("--nk-muted"),
    out: "#0a0812",
    tee: "#262a34",
    teeHi: "#454b5a",
    legs: "#232730",
    legsHi: "#40465a",
    skin: "#f6d0b4",
    skin2: "#e0a98a",
    hair: "#c9a266",
    hair2: "#a07a44",
    metal: "#cfd9e4",
    white: "#f4f6fa",
    blush: "#f19a9f",
    shoeAcc: "#ff9fcf",
    wristL: "#ff3b3b",
    wristR: "#5a8fd6",
  }
}

export const rc = (c, x, y, w, h, col) => {
  c.fillStyle = col
  c.fillRect(Math.round(x), Math.round(y), w, h)
}
function ln(c, a, b, w, col) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))),
    o = (w - 1) / 2
  c.fillStyle = col
  for (let i = 0; i <= n; i++)
    c.fillRect(
      Math.round(a[0] + ((b[0] - a[0]) * i) / n - o),
      Math.round(a[1] + ((b[1] - a[1]) * i) / n - o),
      w,
      w,
    )
}
function poly(c, p, w, col, out) {
  if (out)
    for (let i = 0; i < p.length - 1; i++) ln(c, p[i], p[i + 1], w + 2, out)
  for (let i = 0; i < p.length - 1; i++) ln(c, p[i], p[i + 1], w, col)
}
export function disk(c, cx, cy, r, col) {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy + 0.5))
    rc(c, cx - w, cy + dy, 2 * w + 1, 1, col)
  }
}

// IK двух костей: плечо/бедро s -> цель h; ox = в какую сторону (по x) должен смотреть локоть/колено
function ik(s, h, l1, l2, ox) {
  let dx = h[0] - s[0],
    dy = h[1] - s[1],
    d = Math.hypot(dx, dy)
  const m = l1 + l2 - 0.3
  if (d > m) {
    dx *= m / d
    dy *= m / d
    d = m
  }
  d = Math.max(d, 1)
  const ux = dx / d,
    uy = dy / d,
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
    hh = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const mx = s[0] + ux * a,
    my = s[1] + uy * a,
    e1 = [mx - uy * hh, my + ux * hh],
    e2 = [mx + uy * hh, my - ux * hh]
  return [
    (e1[0] - s[0]) * ox > (e2[0] - s[0]) * ox ? e1 : e2,
    [s[0] + dx, s[1] + dy],
  ]
}

// ---------- голова: 16x14 пикселей ----------
// o контур, h/H волосы, s/d кожа, e глаза, W блик, p румянец, r/R рот
const STYLE = { glasses: false } // STYLE.glasses = true — добавить очки героине
const HEAD_FRONT = (e, m) => {
  const E = [
    ["ee", "eW"],
    ["ss", "ee"],
    ["se", "es"],
  ][e]
  return [
    "....oooo",
    "..ooHhhh",
    ".oHhhhhh",
    ".ohhhhhh",
    ".ohhhhss",
    ".ohhhsss",
    ".ohhssss",
    ".ohsssss",
    `.ohs${E[0]}ss`,
    `.ohs${E[1]}ss`,
    m ? ".ohpssss" : ".ohpsrss",
    m ? "..ohsRRR" : "..ohssrr",
    m ? "...odRRR" : "...odddd",
    "....oooo",
  ].map((r) => r + [...r].reverse().join(""))
}
const HEAD_SIDE = (e, m) => {
  const E = [
    ["ee", "eW"],
    ["ss", "ee"],
    ["se", "es"],
  ][e]
  return [
    "....oooooooo....",
    "..ooHhhhhhhhoo..",
    ".oHhhhhhhhhhhHo.",
    ".ohhhhhhhhhhhho.",
    ".ohhhhhhhhhhsso.",
    ".ohhhhhhhhsssso.",
    ".ohhhhhhhssssso.",
    ".ohhhhsssssssso.",
    `.ohhhhssss${E[0]}sso.`,
    `.ohhhhssss${E[1]}sso.`,
    ".ohhhhsssppssso.",
    `..ohhhsssss${m ? "RR" : "rr"}so.`,
    "...ohhddddddddo.",
    "....oooooooooo..",
  ]
}
function drawHead(c, P, x, y, e, m, side, glasses) {
  const col = {
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
  ;(side ? HEAD_SIDE(e, m) : HEAD_FRONT(e, m)).forEach((r, j) => {
    for (let i = 0; i < 16; i++) {
      const ch = r[i]
      if (ch !== ".") {
        c.fillStyle = col[ch]
        c.fillRect(x + i, y + j, 1, 1)
      }
    }
  })
  if (glasses) {
    const f = "#9b7fd0",
      lens = (lx) => {
        rc(c, x + lx, y + 7, 5, 1, f)
        rc(c, x + lx, y + 10, 5, 1, f)
        rc(c, x + lx, y + 7, 1, 4, f)
        rc(c, x + lx + 4, y + 7, 1, 4, f)
      }
    if (side) lens(9)
    else {
      lens(3)
      lens(8)
    }
  }
}

/* Рисует героиню (чёрная футболка клуба с неоновым принтом, леггинсы, коса с неоновой резинкой, браслеты, бело-розовые кроссовки).
   p = { hip:[x,y], hl, hr (цели рук), fl, fr (цели стоп), eye:0|1|2, mouth:0|1, hd:[dx,dy],
         flow (сила развевания косы), side (вид сбоку), sw (угол косы), alpha, glasses } */
export function girl(c, P, p, t) {
  const [X, Y] = p.hip,
    fl = p.flow ?? 1,
    O = P.out,
    S = !!p.side
  c.globalAlpha = p.alpha ?? 1
  const br = [[X - (S ? 7 : 8), Y - 20]]
  let a = p.sw ?? (S ? -1.1 : -0.35) // коса
  for (let i = 0; i < 9; i++) {
    a += Math.sin(t * 4.2 - i * 0.5) * 0.1 * fl
    const q = br[i]
    br.push([q[0] + Math.sin(a) * 2.3, q[1] + Math.cos(a) * 2.3])
  }
  poly(c, br, 3, P.hair, O)
  for (let i = 0; i < 9; i += 2) ln(c, br[i], br[i + 1], 3, P.hair2)
  for (const q of [br[0], br[9]]) {
    rc(c, q[0] - 2, q[1] - 2, 5, 5, O)
    rc(c, q[0] - 1, q[1] - 1, 3, 3, P.lime)
  } // неоновые резинки
  const leg = (k) => {
    const h = [X + (k ? 2 : -2), Y],
      r = ik(h, k ? p.fr : p.fl, 6, 6, S ? 1 : k ? 1 : -1),
      kn = r[0],
      f = r[1]
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
  rc(c, X - 2, Y - 3, 4, 1, P.lime) // неоновый принт клуба
  rc(c, X - 2, Y - 10, 4, 2, P.skin) // вырез
  const arm = (k) => {
    const s = [X + (k ? 4 : -4), Y - 7],
      r = ik(s, k ? p.hr : p.hl, 7, 7, S ? -1 : k ? 1 : -1),
      el = r[0],
      h = r[1]
    ln(c, s, el, 5, O)
    ln(c, el, h, 5, O)
    ln(c, s, el, 3, P.skin)
    ln(c, el, h, 3, P.skin)
    ln(c, s, mix(s, el, 0.6), 3, P.tee) // рукав футболки
    ln(c, mix(el, h, 0.55), mix(el, h, 0.8), 3, k ? P.wristR : P.wristL) // браслеты
    rc(c, h[0] - 2, h[1] - 2, 5, 5, O)
    rc(c, h[0] - 1, h[1] - 1, 3, 3, P.skin)
  }
  arm(0)
  arm(1)
  const hd = p.hd || [0, 0]
  drawHead(
    c,
    P,
    Math.round(X - 8 + hd[0]),
    Math.round(Y - 23 + hd[1]),
    p.eye || 0,
    p.mouth || 0,
    S,
    p.glasses ?? STYLE.glasses,
  )
  c.globalAlpha = 1
}
