// pixel/runner.js — «Ниндзя-ран»: бесконечный раннер в духе Google Dino / Mario Run на неоновой арене.
// Управление: Пробел / ↑ / тап по верху — прыжок (держи — выше), ↓ / тап по низу — перекат под подвесными матами.
// Награда — светящиеся кольца на каждом препятствии. В прыжке героиня сама цепляется за зиплайн (неуязвима, +30).

import { annulus, arena, drawRing, NEON, trussPost } from "./arena.js"
import { blink, disk, girl, lerp, palette, rc } from "./engine.js"

const GW = 280,
  GH = 110,
  GG = 92,
  PX = 44,
  RR = 11 // «пиксельный» экран, линия пола, x героини, радиус кольца
const DIM = {
  step: [14, 12],
  pedestal: [16, 18],
  beam: [30, 12],
  warped: [26, 30],
  gate: [44, 0],
  pool: [34, 0],
}
const HP = {
  step: (u) => Math.min(1, (0.5 - Math.abs(u - 0.5)) * 6),
  pedestal: (u) => Math.min(1, (0.5 - Math.abs(u - 0.5)) * 3.6),
  beam: () => 1,
  warped: (u) => u ** 2.2,
}
const cable = (o, x) => lerp(o.y0, o.y1, (x - o.x) / o.w)
const RED = "#e03b4a",
  REDL = "#ff6b78",
  REDD = "#8a1f2b",
  PINK = "#ff5fb5",
  PINKL = "#ff9dd3",
  TEAL = "#27c9b8",
  TEALL = "#7ff0e2",
  WATER = "#1666ff",
  WATERL = "#5aa9ff"

// препятствия — по фото арены: красные блоки, розовые тумбы, бирюзовое бревно, красная рампа, бассейн, подвесной мат
const DRAW = {
  step: (c, P, o) => {
    for (let j = 0; j < o.h; j++) {
      const w = Math.round(o.w * (0.45 + 0.55 * (j / o.h))),
        x = Math.round(o.x + (o.w - w) / 2),
        y = GG - o.h + j
      rc(c, x - 1, y, w + 2, 1, P.out)
      rc(c, x, y, w, 1, RED)
      rc(c, x, y, Math.round(w * 0.4), 1, REDL)
    }
    rc(c, o.x + 3, GG - o.h, o.w - 6, 1, REDL)
  },
  pedestal: (c, P, o) => {
    const ch = o.h - 5
    for (let j = 0; j < ch; j++) {
      const w = Math.round(lerp(o.w - 2, 8, j / ch)),
        x = Math.round(o.x + (o.w - w) / 2),
        y = GG - 5 - j
      rc(c, x - 1, y, w + 2, 1, P.out)
      rc(c, x, y, w, 1, PINK)
      rc(c, x, y, Math.max(1, Math.round(w * 0.3)), 1, PINKL)
    }
    rc(c, o.x - 1, GG - 5, o.w + 2, 5, P.out)
    rc(c, o.x, GG - 4, o.w, 4, TEAL)
    rc(c, o.x, GG - 4, o.w, 1, TEALL)
  },
  beam: (c, P, o) => {
    rc(c, o.x - 1, GG - 10, o.w + 2, 10, P.out)
    rc(c, o.x, GG - 9, o.w, 9, "#3d3780")
    rc(c, o.x - 2, GG - o.h - 1, o.w + 4, 5, P.out)
    rc(c, o.x - 1, GG - o.h, o.w + 2, 3, TEAL)
    rc(c, o.x - 1, GG - o.h, o.w + 2, 1, TEALL)
  },
  warped: (c, P, o) => {
    for (let i = 0; i < o.w; i++) {
      const h = Math.max(1, Math.round(o.h * (i / o.w) ** 2.2))
      rc(c, o.x + i, GG - h - 1, 1, 1, P.out)
      rc(c, o.x + i, GG - h, 1, h, RED)
      rc(c, o.x + i, GG - h, 1, 1, REDL)
    }
    rc(c, o.x + o.w - 4, GG - o.h, 4, o.h, REDD)
    rc(c, o.x + o.w, GG - o.h - 3, 2, o.h + 3, P.out)
    rc(c, o.x + o.w - 5, GG - o.h - 2, 6, 2, NEON.truss)
  },
  gate: (c, P, o) => {
    rc(c, o.x + 3, 0, 1, GG - 72, NEON.trussD)
    rc(c, o.x + o.w - 4, 0, 1, GG - 72, NEON.trussD)
    rc(c, o.x - 1, GG - 73, o.w + 2, 40, P.out)
    rc(c, o.x, GG - 72, o.w, 38, "#14102e")
    rc(c, o.x, GG - 72, o.w, 1, NEON.pink)
    rc(c, o.x, GG - 35, o.w, 1, NEON.pink)
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 6; k++) {
        const col = i % 2 ? NEON.cyan : NEON.pink
        rc(c, o.x + 8 + i * 12 + k, GG - 62 + k, 2, 1, col)
        rc(c, o.x + 8 + i * 12 + k, GG - 51 - k, 2, 1, col)
      }
  },
  pool: (c, _P, o, t) => {
    rc(c, o.x - 4, GG, 4, GH - GG, NEON.pad)
    rc(c, o.x + o.w, GG, 4, GH - GG, NEON.pad)
    rc(c, o.x, GG, o.w, GH - GG, WATER)
    for (let i = 0; i < o.w; i += 4)
      rc(c, o.x + i, GG + (((i / 4 + t * 3) | 0) % 2), 3, 1, WATERL)
    c.globalAlpha = 0.22
    rc(c, o.x, GG - 3, o.w, 3, WATERL)
    c.globalAlpha = 1
    rc(c, o.x - 4, GG, 4, 1, NEON.pink)
    rc(c, o.x + o.w, GG, 4, 1, NEON.pink)
  },
  zip: (c, _P, o, t) => {
    for (const x of [o.x, o.x + o.w]) trussPost(c, x - 2, o.y0 - 6, GG)
    for (let i = 0; i <= o.w; i++)
      rc(c, o.x + i, lerp(o.y0, o.y1, i / o.w), 1, 1, NEON.truss)
    for (let i = 10; i < o.w; i += 14)
      rc(
        c,
        o.x + i,
        lerp(o.y0, o.y1, i / o.w) + 1,
        2,
        2,
        ((t * 4 + i / 14) | 0) % 2 ? NEON.cyan : NEON.pink,
      )
  },
}

export function mountGame(root) {
  root.classList.add("nk-game")
  root.innerHTML = `<canvas class="px" width="${GW}" height="${GH}" tabindex="0" aria-label="Игра: беги, прыгай, перекатывайся, цепляйся за зиплайны и собирай светящиеся кольца"></canvas>
<div class="nk-game__hud"><span>КОЛЬЦА <b class="gr">0</b></span><span>РЕКОРД <b class="gb">0</b></span></div>
<div class="nk-game__msg"><b>Ниндзя-ран</b><small>Пробел / тап — прыжок (держи — выше) · ↓ — перекат под матом · в прыжке цепляйся за зиплайн · собирай светящиеся кольца</small></div>
<div class="nk-game__pad"><button data-k="up">Прыжок</button><button data-k="down">Перекат</button></div>`
  const cv = root.querySelector("canvas"),
    c = cv.getContext("2d"),
    msg = root.querySelector(".nk-game__msg"),
    gr = root.querySelector(".gr"),
    gb = root.querySelector(".gb")
  let best = 0
  try {
    best = +localStorage.getItem("nk-best") || 0
  } catch (_e) {
    /* storage недоступен */
  }
  gb.textContent = best

  const fresh = () => ({
    st: "ready",
    t: 0,
    speed: 125,
    dist: 0,
    nr: 0,
    obs: [],
    rings: [],
    fx: [],
    part: [],
    nextD: 60,
    y: 0,
    vy: 0,
    slide: 0,
    roll: 0,
    zip: null,
    grace: 0,
    buf: 0,
    dust: 0,
    over: 0,
  })
  let S = fresh(),
    hold = false,
    down = false,
    hover = false,
    vis = true,
    raf = 0,
    last = performance.now()

  const start = () => {
    S = fresh()
    S.st = "run"
    S.grace = 0.8
    msg.hidden = true
  }
  const jump = () => {
    if (S.st !== "run") {
      start()
      return
    }
    if (S.zip) {
      S.zip = null
      S.vy = 150
      S.y = Math.max(S.y, 1)
      S.grace = 0.4
    } else S.buf = 0.12
  }
  const press = (k) => {
    if (k === "up") {
      hold = true
      jump()
    } else down = true
  }
  const release = (k) => {
    if (k === "up") hold = false
    else down = false
  }

  const keyOf = (e) =>
    e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW"
      ? "up"
      : e.code === "ArrowDown" || e.code === "KeyS"
        ? "down"
        : null
  const active = () =>
    vis && (hover || document.activeElement === cv || S.st === "run")
  const kd = (e) => {
    const k = keyOf(e)
    if (!k || !active()) return
    e.preventDefault()
    if (!e.repeat) press(k)
  }
  const ku = (e) => {
    const k = keyOf(e)
    if (k) release(k)
  }
  cv.addEventListener("pointerdown", (e) => {
    cv.focus({ preventScroll: true })
    const r = cv.getBoundingClientRect()
    cv._pk = e.clientY - r.top < r.height * 0.55 ? "up" : "down"
    press(cv._pk)
    try {
      cv.setPointerCapture(e.pointerId)
    } catch (_x) {
      /* ok */
    }
  })
  ;["pointerup", "pointercancel"].forEach((n) => {
    cv.addEventListener(n, () => release(cv._pk || "up"))
  })
  cv.addEventListener("pointerenter", () => {
    hover = true
  })
  cv.addEventListener("pointerleave", () => {
    hover = false
  })
  root.querySelectorAll(".nk-game__pad button").forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault()
      press(b.dataset.k)
    })
    ;["pointerup", "pointerleave", "pointercancel"].forEach((n) => {
      b.addEventListener(n, () => release(b.dataset.k))
    })
  })

  const burst = (n) => {
    for (let i = 0; i < n; i++)
      S.part.push({
        x: PX - 3 + i * 1.5,
        y: GG - 1,
        vx: -30 + Math.random() * 60,
        vy: -20 * Math.random(),
        l: 0.35,
      })
  }
  function die() {
    S.st = "over"
    S.over = S.t
    if (S.nr > best) {
      best = S.nr
      try {
        localStorage.setItem("nk-best", best)
      } catch (_e) {
        /* ok */
      }
    }
    gb.textContent = best
    msg.innerHTML = `<b>Конец забега</b><small>Колец ${S.nr} · рекорд ${best}. Пробел / тап — ещё раз</small>`
    msg.hidden = false
  }
  function spawn() {
    const x = GW + 12,
      d = S.dist,
      gap = () => S.speed * (0.85 + Math.random() * 0.9) + 36
    if (d > 350 && Math.random() < 0.27) {
      // зиплайн + препятствия под ним; кольца висят вдоль троса
      S.obs.push(
        { t: "zip", x, w: 150, y0: GG - 58, y1: GG - 46 },
        { t: "step", x: x + 45, w: 14, h: 12 },
        { t: "pedestal", x: x + 95, w: 16, h: 18 },
      )
      for (const i of [40, 75, 110])
        S.rings.push({ x: x + i, y: lerp(GG - 58, GG - 46, i / 150) + 12 })
      S.nextD = d + 150 + gap() + 30
      return
    }
    const pool = ["step", "pedestal", "beam"]
    if (d > 500) pool.push("gate")
    if (d > 1000) pool.push("pool")
    if (d > 1700) pool.push("warped")
    const t = pool[(Math.random() * pool.length) | 0],
      dm = DIM[t]
    S.obs.push({ t, x, w: dm[0], h: dm[1] })
    if (Math.random() < 0.5)
      S.rings.push({
        x: x + dm[0] / 2,
        y: {
          step: GG - 48,
          pedestal: GG - 52,
          beam: GG - 48,
          warped: GG - 62,
          gate: GG - 9,
          pool: GG - 50,
        }[t],
      }) // кольцо-награда примерно на половине препятствий
    S.nextD = d + dm[0] + gap()
  }

  function update(dt) {
    S.t += dt
    if (S.st !== "run") return
    S.grace = Math.max(0, S.grace - dt)
    S.buf = Math.max(0, S.buf - dt)
    const sp = S.speed * (S.zip ? 1.5 : 1)
    S.dist += sp * dt
    S.speed = 125 + S.dist * 0.02
    if (S.zip) {
      // едем по тросу
      const z = S.zip.o
      if (down) {
        S.zip = null
        S.grace = 0.4
      } else {
        S.y = GG - 15 - (cable(z, PX) + 17.4)
        S.vy = 0
        S.slide = 0
        if (PX >= z.x + z.w - 6) {
          S.zip = null
          S.grace = 0.6
        }
      }
    }
    if (!S.zip) {
      // прыжок / падение / перекат
      if (S.y > 0 || S.vy > 0) {
        const g = S.vy > 0 && hold ? 380 : 640
        S.vy -= g * dt
        S.y += S.vy * dt
        if (S.y <= 0) {
          S.y = 0
          S.vy = 0
          burst(6)
        }
      }
      if (S.y === 0 && S.buf > 0) {
        S.vy = 185
        S.y = 0.01
        S.buf = 0
        S.slide = 0
      }
      if (down && S.y > 0 && S.vy > -260) S.vy = -260
      if (S.y === 0) {
        if (down) S.slide = 0.45
        else S.slide = Math.max(0, S.slide - dt)
      }
      if (S.slide > 0) S.roll += dt * 14
    }
    if (S.dist >= S.nextD) spawn()
    for (const o of S.obs) o.x -= sp * dt
    for (const k of S.rings) k.x -= sp * dt
    S.obs = S.obs.filter((o) => o.x + o.w > -24)
    S.rings = S.rings.filter((k) => k.x > -20 && !k.g)
    if (!S.zip && S.y > 6)
      for (const o of S.obs)
        if (
          o.t === "zip" &&
          PX > o.x + 6 &&
          PX < o.x + o.w - 14 &&
          Math.abs(GG - 36 - S.y - cable(o, PX)) <= 5
        ) {
          S.zip = { o }
          S.vy = 0
          break
        }
    const bt = GG - 1 - S.y,
      tp = S.slide > 0 && S.y === 0 ? bt - 12 : bt - 35,
      l = PX - 4,
      r = PX + 4
    for (const k of S.rings)
      if (
        !k.g &&
        Math.abs(k.x - PX) < RR + 4 &&
        k.y + RR > tp &&
        k.y - RR < bt
      ) {
        k.g = 1
        S.nr++
        S.fx.push({ x: k.x, y: k.y, l: 0.45 })
      } // собрали кольцо
    if (!S.zip && !S.grace) {
      // столкновения
      for (const o of S.obs) {
        if (o.t === "zip") continue
        if (o.t === "pool") {
          if (S.y === 0 && PX > o.x + 3 && PX < o.x + o.w - 3) {
            die()
            return
          }
          continue
        }
        if (o.t === "gate") {
          if (
            r > o.x + 1 &&
            l < o.x + o.w - 1 &&
            bt > GG - 72 &&
            tp < GG - 34
          ) {
            die()
            return
          }
          continue
        }
        for (const x of [l, PX, r])
          if (
            x > o.x + 1 &&
            x < o.x + o.w - 1 &&
            bt > GG - o.h * HP[o.t]((x - o.x) / o.w) + 1
          ) {
            die()
            return
          }
      }
    }
    for (const f of S.fx) f.l -= dt
    S.fx = S.fx.filter((f) => f.l > 0)
    S.dust -= dt
    if (S.y === 0 && S.dust <= 0) {
      S.dust = 0.09
      S.part.push({ x: PX - 4, y: GG - 1, vx: -40, vy: -8, l: 0.3 })
    }
    for (const p of S.part) {
      p.x += (p.vx - sp * 0.3) * dt
      p.y += p.vy * dt
      p.l -= dt
    }
    S.part = S.part.filter((p) => p.l > 0)
  }

  function pose(t, tq) {
    const X = PX
    if (S.st === "over")
      return {
        side: 1,
        hip: [X - 3, GG - 12],
        hl: [X - 8, GG - 26],
        hr: [X + 7, GG - 26],
        fl: [X - 4, GG - 3],
        fr: [X + 4, GG - 3],
        eye: 1,
        mouth: 1,
        flow: 0.3,
        sw: -0.5,
        hd: [0, 1],
      }
    if (S.zip) {
      // вис на зиплайне
      const cy = cable(S.zip.o, X),
        hip = [X, cy + 17.4],
        sw = Math.sin(t * 5)
      return {
        side: 1,
        hip,
        hl: [X - 1, cy],
        hr: [X + 3, cy],
        fl: [X - 2 + 5 * sw, hip[1] + 11],
        fr: [X + 2 + 5 * sw, hip[1] + 11],
        eye: 0,
        mouth: 1,
        flow: 1.3,
        sw: -1.3,
      }
    }
    if (S.y > 0) {
      // прыжок: группировка вверх, вытягивание вниз
      const hip = [X, GG - 15 - S.y],
        up = S.vy > 0
      return {
        side: 1,
        hip,
        hl: [X + 8, hip[1] - (up ? 14 : 4)],
        hr: [X + 5, hip[1] - (up ? 12 : 8)],
        fl: up ? [X + 3, hip[1] + 8] : [X + 4, hip[1] + 11],
        fr: up ? [X - 3, hip[1] + 10] : [X - 2, hip[1] + 10],
        eye: 0,
        mouth: 1,
        flow: 1.5,
        sw: -1.35,
      }
    }
    const run = S.st === "run",
      ph = tq * 17,
      s = run ? Math.sin(ph) : 0,
      cc = run ? Math.cos(ph) : 1,
      hip = [X, GG - 15 - Math.abs(s) * 1.5] // бег
    return {
      side: 1,
      hip,
      hl: [X - 1 + 7 * s, hip[1] + 2 - Math.abs(cc) * 2],
      hr: [X + 7 - 7 * s, hip[1] + 2 - Math.abs(cc) * 2],
      fl: [X - 1 + 7 * s, GG - 3 - Math.max(0, cc) * 5],
      fr: [X - 1 - 7 * s, GG - 3 - Math.max(0, -cc) * 5],
      eye: blink(t) ? 1 : 0,
      mouth: 0,
      flow: run ? 1.5 : 0.4,
      sw: run ? -1.3 : -1,
    }
  }
  function ball(P) {
    // кувырок: вращающийся «клубок»
    const cx = PX,
      cy = GG - 9,
      a = S.roll,
      dot = (g, r, s, col) =>
        rc(
          c,
          cx + Math.cos(g) * r - s / 2,
          cy + Math.sin(g) * r - s / 2,
          s,
          s,
          col,
        )
    disk(c, cx, cy, 9, P.out)
    disk(c, cx, cy, 8, P.teeHi)
    dot(a, 5.5, 4, P.hair)
    dot(a + 2.1, 5.5, 3, P.lime)
    dot(a + 4.2, 5.5, 3, P.white)
    dot(a + 1.05, 6, 2, P.wristL)
    dot(a + 3.1, 6, 2, P.skin)
  }

  function draw(ms) {
    const P = palette(),
      t = ms / 1000,
      tq = Math.floor(t * 12) / 12
    c.clearRect(0, 0, GW, GH)
    arena(c, P, {
      W: GW,
      H: GH,
      gy: GG,
      scroll: S.st === "ready" ? S.t * 24 : S.dist,
      t,
    })
    for (const o of S.obs) DRAW[o.t](c, P, o, t)
    for (const k of S.rings) if (!k.g) drawRing(c, P, k.x, k.y, t, RR)
    for (const f of S.fx) {
      // вспышка при сборе кольца
      const r = RR + (0.45 - f.l) * 36
      c.globalAlpha = Math.max(0, f.l / 0.45)
      annulus(c, Math.round(f.x), Math.round(f.y), r - 1.5, r, "#f6fdff")
      for (let i = 0; i < 6; i++)
        rc(
          c,
          f.x + Math.cos(i * 1.05) * r * 1.3,
          f.y + Math.sin(i * 1.05) * r * 1.3,
          2,
          2,
          P.steel,
        )
      c.globalAlpha = 1
    }
    for (const p of S.part) rc(c, p.x, p.y, 2, 2, P.muted)
    if (S.zip) {
      const cy = cable(S.zip.o, PX)
      rc(c, PX - 4, cy - 3, 10, 3, P.out)
      rc(c, PX - 3, cy - 2, 8, 2, NEON.cyan)
      for (let i = 0; i < 5; i++)
        rc(
          c,
          (i * 61 + S.dist * 2) % GW,
          10 + i * 14,
          12,
          1,
          "rgba(255,255,255,.35)",
        )
    }
    if (S.st === "run" && S.slide > 0 && S.y === 0) ball(P)
    else girl(c, P, pose(t, tq), tq)
    if (S.st === "over" && S.t - S.over < 0.15) {
      c.fillStyle = "rgba(255,60,60,.25)"
      c.fillRect(0, 0, GW, GH)
    }
    gr.textContent = S.nr
  }

  const loop = (ms) => {
    const dt = Math.min(0.05, (ms - last) / 1000)
    last = ms
    if (vis) {
      update(dt)
      draw(ms)
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  const io = new IntersectionObserver(([e]) => {
    vis = e.isIntersecting
  })
  io.observe(cv)
  addEventListener("keydown", kd)
  addEventListener("keyup", ku)
  return () => {
    cancelAnimationFrame(raf)
    io.disconnect()
    removeEventListener("keydown", kd)
    removeEventListener("keyup", ku)
    root.innerHTML = ""
    root.classList.remove("nk-game")
  }
}
