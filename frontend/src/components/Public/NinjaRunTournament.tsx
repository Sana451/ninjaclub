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

type Player = { id: number; name: string }
type Result = GameResult
type Duel = {
  players: [Player, Player]
  seed: number
  started: boolean
  winner: 0 | 1 | null
}
type Round = { name: string; duels: Duel[] }
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

function roundName(pairs: number): string {
  if (pairs === 4) return "Полуфинал"
  if (pairs === 2) return "Финал"
  if (pairs === 1) return "Суперфинал"
  return "Раунд"
}

function buildRound(players: Player[]): Round {
  const list = shuffle(players)
  const duels: Duel[] = []
  for (let i = 0; i + 1 < list.length; i += 2) {
    duels.push({
      players: [list[i], list[i + 1]],
      seed: Math.floor(Math.random() * 1_000_000_000),
      started: false,
      winner: null,
    })
  }
  return { name: roundName(duels.length), duels }
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

function patchDuel(s: State, f: (du: Duel) => Duel): State {
  const rounds = s.rounds.map((rd, ri) =>
    ri !== s.r
      ? rd
      : {
          ...rd,
          duels: rd.duels.map((du, di) => (di !== s.d ? du : f(du))),
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
        rounds: [buildRound(top)],
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
      const duel = round.duels[s.d]
      if (!duel || duel.winner === null) return s
      if (s.d + 1 < round.duels.length) return { ...s, d: s.d + 1 }
      const winners = round.duels.map((du) => du.players[du.winner ?? 0])
      if (winners.length === 1) return { ...s, champion: winners[0] }
      return {
        ...s,
        rounds: [...s.rounds, buildRound(winners)],
        r: s.r + 1,
        d: 0,
      }
    }
    case "reset":
      return initialState(s.players, s.nextId)
  }
}

type ScreenProps = {
  label: string
  name: string
  controls: Controls
  seed: number
  running: boolean
  onEnd: (result: Result) => void
}

export function GameScreen({
  label,
  name,
  controls,
  seed,
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
      seed,
      keys: CONTROLS[controls],
      onEnd: (result) => endRef.current(result),
    }
    const ctl = mountGame(el, opts)
    ctlRef.current = ctl
    return () => {
      ctl.dispose()
      ctlRef.current = null
    }
  }, [controls, seed, name])

  useEffect(() => {
    const ctl = ctlRef.current
    if (!ctl) return
    if (running) ctl.start()
    else ctl.stop()
  }, [running])

  return (
    <div className="min-w-0">
      <div className="nk-muted mb-2 text-sm">{label}</div>
      <div ref={ref} />
    </div>
  )
}

function RankTable({
  players,
  attempts,
}: {
  players: Player[]
  attempts: Record<number, Result[]>
}) {
  const rows = rankPlayers(players, attempts)
  if (rows.length === 0) return null
  return (
    <div className="nk-card overflow-x-auto p-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="nk-muted">
            <th className="py-1">#</th>
            <th className="py-1">Участник</th>
            <th className="py-1">Кольца</th>
            <th className="py-1">Дистанция</th>
            <th className="py-1">Попыток</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.player.id}>
              <td className="py-1">{i + 1}</td>
              <td className="py-1">{row.player.name}</td>
              <td className="py-1">{row.best?.rings ?? "—"}</td>
              <td className="py-1">{row.best?.dist ?? "—"}</td>
              <td className="py-1">{attempts[row.player.id]?.length ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function NinjaRunTournament() {
  const [s, dispatch] = useReducer(reducer, undefined, () => initialState())
  const [name, setName] = useState("")

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
          <p>
            Отбор: <b>{player?.name}</b>, попытка {attemptNo} из {ATTEMPTS}
          </p>
          {resetButton}
        </div>
        <GameScreen
          key={`q-${s.qPos}`}
          label="Трасса отбора"
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
        <RankTable players={s.players} attempts={s.attempts} />
      </div>
    )
  }

  const round = s.rounds[s.r]
  const duel = round?.duels[s.d]
  const live = !!duel && duel.started && duel.winner === null && !s.champion

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="nk-h3">
          {round?.name} · пара {s.d + 1} из {round?.duels.length ?? 0}
        </h2>
        {resetButton}
      </div>

      {s.champion && (
        <div className="nk-card p-4 text-center">
          🏆 Чемпион турнира: <b>{s.champion.name}</b>
        </div>
      )}

      {round && duel && (
        <>
          <div className="flex flex-col gap-4">
            <GameScreen
              key={`${s.r}-${s.d}-0`}
              label={`${duel.players[0].name} — W / S`}
              name={duel.players[0].name}
              controls="p1"
              seed={duel.seed}
              running={live}
              onEnd={() => dispatch({ type: "crash", side: 0 })}
            />
            <GameScreen
              key={`${s.r}-${s.d}-1`}
              label={`${duel.players[1].name} — ↑ / ↓`}
              name={duel.players[1].name}
              controls="p2"
              seed={duel.seed}
              running={live}
              onEnd={() => dispatch({ type: "crash", side: 1 })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!duel.started && (
              <button
                type="button"
                className="nk-btn nk-btn--lime"
                onClick={() => dispatch({ type: "duelStart" })}
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
                <p>
                  Проиграл:{" "}
                  <b>{duel.players[duel.winner === 0 ? 1 : 0].name}</b>
                  {" · "}
                  Победил: <b>{duel.players[duel.winner].name}</b>
                </p>
                <button
                  type="button"
                  className="nk-btn nk-btn--lime"
                  onClick={() => dispatch({ type: "nextDuel" })}
                >
                  {round.duels.length === 1
                    ? "Завершить турнир"
                    : "Следующая пара"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
