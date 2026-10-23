import { useEffect, useReducer, useRef, useState } from "react"

import {
  type GameController,
  type GameKeys,
  type GameOptions,
  type GameResult,
  mountGame,
} from "./ninja-run/runner.js"

const ATTEMPTS = 3
const MAX_BRACKET = 8
// Одинаковые трассы для всех участников: попытка N всегда идёт на одной и той же трассе
const QUALI_SEEDS = [101, 202, 303]

type Controls = "solo" | "p1" | "p2"
const CONTROLS: Record<Controls, GameKeys | undefined> = {
  solo: undefined,
  p1: { up: ["KeyW"], down: ["KeyS"] },
  p2: { up: ["ArrowUp"], down: ["ArrowDown"] },
}

const TINT: Record<Controls, string | undefined> = {
  solo: undefined,
  p1: undefined,
  p2: "hue-rotate(40deg) saturate(1.15) brightness(1.04)",
}

type Player = { id: number; name: string }
type Result = GameResult
type Match = {
  players: [Player | null, Player | null]
  seed: number
  started: boolean
  winner: 0 | 1 | null
}
type Round = { name: string; matches: Match[] }
type Phase = "setup" | "qualifying" | "bracket"
type State = {
  phase: Phase
  players: Player[]
  nextId: number
  attempts: Record<number, Result[]>
  qPos: number
  qRunning: boolean
  rounds: Round[]
  r: number
  d: number
  champion: Player | null
}

type Action =
  | { type: "add"; name: string }
  | { type: "remove"; id: number }
  | { type: "begin" }
  | { type: "qStart" }
  | { type: "qEnd"; result: Result }
  | { type: "duelStart" }
  | { type: "crash"; side: 0 | 1 }
  | { type: "nextDuel" }
  | { type: "reset" }

function initialState(players: Player[] = [], nextId = 1): State {
  return {
    phase: "setup",
    players,
    nextId,
    attempts: {},
    qPos: 0,
    qRunning: false,
    rounds: [],
    r: 0,
    d: 0,
    champion: null,
  }
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Наибольшая степень двойки, не больше 8 и не больше числа участников
function bracketSize(n: number): number {
  const cap = Math.min(MAX_BRACKET, n)
  let size = 1
  while (size * 2 <= cap) size *= 2
  return size
}

// Название раунда по числу участников в нём
const ROUND_NAMES: Record<number, string> = {
  2: "Финал",
  4: "Полуфинал",
  8: "1/4 финала",
  16: "1/8 финала",
}

function newMatch(players: [Player | null, Player | null]): Match {
  return {
    players,
    seed: Math.floor(Math.random() * 1_000_000_000),
    started: false,
    winner: null,
  }
}

// Полная сетка на вылет: первый раунд заполнен, дальше места заполняются по мере побед
function buildBracket(players: Player[]): Round[] {
  const list = shuffle(players)
  const rounds: Round[] = []
  let slots = list.length
  let first = true
  while (slots > 1) {
    const matches: Match[] = []
    for (let i = 0; i < slots; i += 2)
      matches.push(newMatch(first ? [list[i], list[i + 1]] : [null, null]))
    rounds.push({ name: ROUND_NAMES[slots] ?? "Раунд", matches })
    slots /= 2
    first = false
  }
  return rounds
}

function bestOf(list: Result[] | undefined): Result | undefined {
  if (!list || list.length === 0) return undefined
  return [...list].sort((a, b) => b.rings - a.rings || b.dist - a.dist)[0]
}

// Сортировка: кольца, затем дистанция
function rankPlayers(players: Player[], attempts: Record<number, Result[]>) {
  return players
    .map((player) => ({ player, best: bestOf(attempts[player.id]) }))
    .sort(
      (a, b) =>
        (b.best?.rings ?? -1) - (a.best?.rings ?? -1) ||
        (b.best?.dist ?? -1) - (a.best?.dist ?? -1),
    )
}

function patchDuel(s: State, f: (du: Match) => Match): State {
  const rounds = s.rounds.map((rd, ri) =>
    ri !== s.r
      ? rd
      : {
          ...rd,
          matches: rd.matches.map((du, di) => (di !== s.d ? du : f(du))),
        },
  )
  return { ...s, rounds }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "add": {
      const name = a.name.trim()
      if (!name || s.phase !== "setup") return s
      return {
        ...s,
        players: [...s.players, { id: s.nextId, name }],
        nextId: s.nextId + 1,
      }
    }
    case "remove":
      return s.phase === "setup"
        ? { ...s, players: s.players.filter((p) => p.id !== a.id) }
        : s
    case "begin":
      if (s.players.length < 2) return s
      return {
        ...s,
        phase: "qualifying",
        attempts: {},
        qPos: 0,
        qRunning: false,
      }
    case "qStart":
      return s.phase === "qualifying" &&
        !s.qRunning &&
        s.qPos < s.players.length * ATTEMPTS
        ? { ...s, qRunning: true }
        : s
    case "qEnd": {
      if (s.phase !== "qualifying" || !s.qRunning) return s
      const pid = s.players[Math.floor(s.qPos / ATTEMPTS)].id
      const attempts = {
        ...s.attempts,
        [pid]: [...(s.attempts[pid] ?? []), a.result],
      }
      const qPos = s.qPos + 1
      const next: State = { ...s, attempts, qPos, qRunning: false }
      if (qPos < s.players.length * ATTEMPTS) return next
      const ranked = rankPlayers(s.players, attempts).map((x) => x.player)
      const top = ranked.slice(0, bracketSize(ranked.length))
      return {
        ...next,
        phase: "bracket",
        rounds: buildBracket(top),
        r: 0,
        d: 0,
        champion: null,
      }
    }
    case "duelStart":
      return patchDuel(s, (du) =>
        du.started || du.winner !== null ? du : { ...du, started: true },
      )
    case "crash":
      // Первый, кто врезался, проигрывает; повторные события игнорируются
      return patchDuel(s, (du) =>
        !du.started || du.winner !== null
          ? du
          : { ...du, winner: a.side === 0 ? 1 : 0 },
      )
    case "nextDuel": {
      const round = s.rounds[s.r]
      if (!round || s.champion) return s
      const match = round.matches[s.d]
      const winner =
        match && match.winner !== null ? match.players[match.winner] : null
      if (!winner) return s
      const nextRound = s.rounds[s.r + 1]
      // Победитель пары 2k и 2k+1 попадает в матч k следующего раунда
      const rounds = nextRound
        ? s.rounds.map((rd, ri) =>
            ri !== s.r + 1
              ? rd
              : {
                  ...rd,
                  matches: rd.matches.map((m, mi) => {
                    if (mi !== Math.floor(s.d / 2)) return m
                    const players = [...m.players] as [
                      Player | null,
                      Player | null,
                    ]
                    players[s.d % 2] = winner
                    return { ...m, players }
                  }),
                },
          )
        : s.rounds
      const next = { ...s, rounds }
      if (s.d + 1 < round.matches.length) return { ...next, d: s.d + 1 }
      if (!nextRound) return { ...next, champion: winner }
      return { ...next, r: s.r + 1, d: 0 }
    }
    case "reset":
      return initialState(s.players, s.nextId)
  }
}

type ScreenProps = {
  name: string
  controls: Controls
  seed: number
  duel?: boolean
  running: boolean
  onEnd: (result: Result) => void
}

const KEY_HINT: Record<Controls, string | null> = {
  solo: null,
  p1: "W / S",
  p2: "↑ / ↓",
}

const COUNT_STEPS = ["3", "2", "1", "GO!"]
const COUNT_STEP_MS = 750

export function WinnerBanner({ name }: { name: string }) {
  return (
    <div className="nk-winner" role="status" aria-live="polite">
      <b>Победил: {name}</b>
    </div>
  )
}

export function Countdown({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])
  useEffect(() => {
    const t = setTimeout(
      () =>
        step < COUNT_STEPS.length - 1
          ? setStep((n) => n + 1)
          : doneRef.current(),
      COUNT_STEP_MS,
    )
    return () => clearTimeout(t)
  }, [step])
  const label = COUNT_STEPS[step]
  return (
    <div className="nk-count" role="status" aria-live="assertive">
      <b
        key={step}
        style={label === "GO!" ? { color: "var(--nk-lime)" } : undefined}
      >
        {label}
      </b>
    </div>
  )
}

export function Versus({
  left,
  right,
  onDone,
}: {
  left: string
  right: string
  onDone: () => void
}) {
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])
  useEffect(() => {
    const onKey = () => doneRef.current()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  return (
    <div className="nk-versus" role="status" aria-live="assertive">
      <span className="nk-versus__name nk-versus__name--l">{left}</span>
      <b className="nk-versus__vs">VS</b>
      <span className="nk-versus__name nk-versus__name--r">{right}</span>
      <span className="nk-versus__hint">Нажмите любую клавишу</span>
    </div>
  )
}

export function GameScreen({
  name,
  controls,
  seed,
  duel,
  running,
  onEnd,
}: ScreenProps) {
  const ref = useRef<HTMLDivElement>(null)
  const ctlRef = useRef<GameController | null>(null)
  const endRef = useRef(onEnd)

  useEffect(() => {
    endRef.current = onEnd
  }, [onEnd])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const opts: GameOptions = {
      manual: true,
      name,
      filter: TINT[controls],
      boy: controls === "p2",
      seed,
      duel,
      keys: CONTROLS[controls],
      onEnd: (result) => endRef.current(result),
    }
    const ctl = mountGame(el, opts)
    ctlRef.current = ctl
    return () => {
      ctl.dispose()
      ctlRef.current = null
    }
  }, [controls, seed, name, duel])

  useEffect(() => {
    const ctl = ctlRef.current
    if (!ctl) return
    if (running) ctl.start()
    else ctl.stop()
  }, [running])

  return (
    <div className="min-w-0">
      <div className="nk-screen-head">
        {KEY_HINT[controls] && (
          <span className="nk-keys">
            Управление: <kbd>{KEY_HINT[controls]}</kbd>
          </span>
        )}
      </div>
      <div ref={ref} />
    </div>
  )
}

function RankTable({
  players,
  attempts,
  qualifyCount,
}: {
  players: Player[]
  attempts: Record<number, Result[]>
  qualifyCount: number
}) {
  const rows = rankPlayers(players, attempts)
  if (rows.length === 0) return null
  return (
    <div className="nk-card overflow-x-auto p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="nk-h3">Табло отбора</h3>
        <span className="nk-badge nk-badge--lime">В сетку: {qualifyCount}</span>
      </div>
      <table className="nk-table w-full">
        <thead>
          <tr>
            <th>#</th>
            <th>Участник</th>
            <th>Кольца</th>
            <th>Дистанция</th>
            <th>Попыток</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.player.id}
              className={[
                i < qualifyCount ? "nk-table__q" : "",
                i === qualifyCount - 1 ? "nk-table__cut" : "",
              ].join(" ")}
            >
              <td>
                <span className={`nk-rank${i < 3 ? ` nk-rank--${i + 1}` : ""}`}>
                  {i + 1}
                </span>
              </td>
              <td className="font-semibold uppercase">{row.player.name}</td>
              <td>{row.best?.rings ?? "—"}</td>
              <td>{row.best?.dist ?? "—"}</td>
              <td>{attempts[row.player.id]?.length ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BracketView({
  rounds,
  r,
  d,
  champion,
}: {
  rounds: Round[]
  r: number
  d: number
  champion: Player | null
}) {
  return (
    <div className="nk-card overflow-x-auto p-4">
      <div className="nk-bracket">
        {rounds.map((rd, ri) => (
          <div key={ri} className="nk-bracket__col">
            <div className="nk-bracket__title">{rd.name}</div>
            {rd.matches.map((m, mi) => (
              <div
                key={mi}
                className={`nk-bracket__match${
                  ri === r && mi === d && !champion
                    ? " nk-bracket__match--live"
                    : ""
                }`}
              >
                {m.players.map((p, si) => (
                  <div
                    key={si}
                    className={`nk-bracket__slot${
                      m.winner === si ? " nk-bracket__slot--win" : ""
                    }${m.winner !== null && m.winner !== si ? " nk-bracket__slot--lose" : ""}`}
                  >
                    <span>{p?.name ?? "—"}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
        {champion && (
          <div className="nk-bracket__col">
            <div className="nk-bracket__title">Чемпион</div>
            <div className="nk-bracket__champ">🏆 {champion.name}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export function NinjaRunTournament() {
  const [s, dispatch] = useReducer(reducer, undefined, () => initialState())
  const [name, setName] = useState("")
  const [counting, setCounting] = useState(false)
  const [introKey, setIntroKey] = useState("")

  if (s.phase === "setup") {
    const n = s.players.length
    return (
      <div className="nk-card space-y-4 p-6">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            dispatch({ type: "add", name })
            setName("")
          }}
        >
          <input
            className="nk-input flex-1"
            value={name}
            maxLength={24}
            placeholder="Имя участника"
            aria-label="Имя участника"
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="nk-btn nk-btn--sm">
            Добавить
          </button>
        </form>
        <ol className="space-y-2">
          {s.players.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span>
                {i + 1}. {p.name}
              </span>
              <button
                type="button"
                className="nk-btn nk-btn--ghost nk-btn--sm"
                onClick={() => dispatch({ type: "remove", id: p.id })}
              >
                Удалить
              </button>
            </li>
          ))}
        </ol>
        <p className="nk-muted text-sm">
          Участников: {n}. Каждый делает {ATTEMPTS} попытки; в турнир выходят до{" "}
          {MAX_BRACKET} лучших (минимум 2 участника).
        </p>
        <button
          type="button"
          className="nk-btn nk-btn--lime"
          disabled={n < 2}
          onClick={() => dispatch({ type: "begin" })}
        >
          Начать отборочный этап
        </button>
      </div>
    )
  }

  const resetButton = (
    <button
      type="button"
      className="nk-btn nk-btn--ghost nk-btn--sm"
      onClick={() => dispatch({ type: "reset" })}
    >
      Сбросить турнир
    </button>
  )

  if (s.phase === "qualifying") {
    const player = s.players[Math.floor(s.qPos / ATTEMPTS)]
    const attemptNo = (s.qPos % ATTEMPTS) + 1
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="nk-stage">
            <span className="nk-stage__tag">Отбор</span>
            <span className="nk-stage__name">{player?.name}</span>
            <span className="nk-stage__try">
              Попытка {attemptNo} из {ATTEMPTS}
            </span>
          </div>
          {resetButton}
        </div>
        <GameScreen
          key={`q-${s.qPos}`}
          name={player?.name ?? ""}
          controls="solo"
          seed={QUALI_SEEDS[s.qPos % ATTEMPTS]}
          running={s.qRunning}
          onEnd={(result) => dispatch({ type: "qEnd", result })}
        />
        <button
          type="button"
          className="nk-btn nk-btn--lime"
          disabled={s.qRunning}
          onClick={() => dispatch({ type: "qStart" })}
        >
          Старт попытки
        </button>
        <RankTable
          players={s.players}
          attempts={s.attempts}
          qualifyCount={bracketSize(s.players.length)}
        />
      </div>
    )
  }

  const round = s.rounds[s.r]
  const duel = round?.matches[s.d]
  const p0 = duel?.players[0]
  const p1 = duel?.players[1]
  const live = !!duel && duel.started && duel.winner === null && !s.champion
  const pairKey = `${s.r}-${s.d}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="nk-h3">
          {round?.name} · пара {s.d + 1} из {round?.matches.length ?? 0}
        </h2>
        {resetButton}
      </div>

      {round && duel && p0 && p1 && (
        <>
          {!duel.started && introKey !== pairKey && (
            <Versus
              key={pairKey}
              left={p0.name}
              right={p1.name}
              onDone={() => setIntroKey(pairKey)}
            />
          )}
          {counting && (
            <Countdown
              onDone={() => {
                setCounting(false)
                dispatch({ type: "duelStart" })
              }}
            />
          )}
          <div className="nk-pair flex flex-col gap-4">
            <GameScreen
              key={`${s.r}-${s.d}-0`}
              name={p0.name}
              controls="p1"
              seed={duel.seed}
              duel
              running={live}
              onEnd={() => dispatch({ type: "crash", side: 0 })}
            />
            <GameScreen
              key={`${s.r}-${s.d}-1`}
              name={p1.name}
              controls="p2"
              seed={duel.seed}
              duel
              running={live}
              onEnd={() => dispatch({ type: "crash", side: 1 })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!duel.started && (
              <button
                type="button"
                className="nk-btn nk-btn--lime"
                disabled={counting}
                onClick={() => setCounting(true)}
              >
                Старт пары
              </button>
            )}
            {duel.started && duel.winner === null && (
              <p className="nk-muted">
                Идёт заезд: первый, кто врежется, проигрывает.
              </p>
            )}
            {duel.winner !== null && !s.champion && (
              <>
                <WinnerBanner
                  key={`${s.r}-${s.d}-w`}
                  name={(duel.winner === 0 ? p0 : p1).name}
                />
                <button
                  type="button"
                  className="nk-btn nk-btn--lime"
                  onClick={() => dispatch({ type: "nextDuel" })}
                >
                  {round.matches.length === 1
                    ? "Завершить турнир"
                    : "Следующая пара"}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {s.champion && (
        <div className="nk-card p-4 text-center">
          🏆 Чемпион турнира: <b>{s.champion.name}</b>
        </div>
      )}

      <BracketView rounds={s.rounds} r={s.r} d={s.d} champion={s.champion} />
    </div>
  )
}
