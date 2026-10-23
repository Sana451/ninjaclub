import { useEffect, useReducer, useRef, useState } from "react"

import { PodiumScene } from "@/components/Common/PodiumScene"

import { CharacterSelect } from "./ninja-run/CharacterSelect.js"
import {
  characterName,
  DEFAULT_CHARACTER,
  type Look,
  lookOf,
} from "./ninja-run/characters.js"
import {
  type GameController,
  type GameKeys,
  type GameOptions,
  type GameResult,
  mountGame,
} from "./ninja-run/runner.js"

const ATTEMPT_OPTIONS = [1, 2, 3]
const DEFAULT_ATTEMPTS = 3
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

type Player = { id: number; name: string; character: string }
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
  attemptsPerPlayer: number
  attempts: Record<number, Result[]>
  qPos: number
  qRunning: boolean
  rounds: Round[]
  r: number
  d: number
  champion: Player | null
  championBoy: boolean
  // Ключ последнего этапа, заставка которого уже закрыта
  introSeen: string
}

type Action =
  | { type: "add"; name: string; character: string }
  | { type: "remove"; id: number }
  | { type: "setAttempts"; value: number }
  | { type: "begin" }
  | { type: "introSeen"; key: string }
  | { type: "qStart" }
  | { type: "qEnd"; result: Result }
  | { type: "duelStart" }
  | { type: "crash"; side: 0 | 1 }
  | { type: "nextDuel" }
  | { type: "reset" }

function initialState(
  players: Player[] = [],
  nextId = 1,
  attemptsPerPlayer = DEFAULT_ATTEMPTS,
): State {
  return {
    phase: "setup",
    players,
    nextId,
    attemptsPerPlayer,
    attempts: {},
    qPos: 0,
    qRunning: false,
    rounds: [],
    r: 0,
    d: 0,
    champion: null,
    championBoy: false,
    introSeen: "",
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

// Склонение: 1 попытка, 2–3 попытки
function attemptsWord(n: number): string {
  return n === 1 ? "попытку" : "попытки"
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
  2: "СУПЕРФИНАЛ",
  4: "ФИНАЛ",
  8: "ПОЛУФИНАЛ",
  16: "1/8 ФИНАЛА",
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
        players: [...s.players, { id: s.nextId, name, character: a.character }],
        nextId: s.nextId + 1,
      }
    }
    case "remove":
      return s.phase === "setup"
        ? { ...s, players: s.players.filter((p) => p.id !== a.id) }
        : s
    case "setAttempts":
      return s.phase === "setup" && ATTEMPT_OPTIONS.includes(a.value)
        ? { ...s, attemptsPerPlayer: a.value }
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
    case "introSeen":
      return { ...s, introSeen: a.key }
    case "qStart":
      return s.phase === "qualifying" &&
        !s.qRunning &&
        s.qPos < s.players.length * s.attemptsPerPlayer
        ? { ...s, qRunning: true }
        : s
    case "qEnd": {
      if (s.phase !== "qualifying" || !s.qRunning) return s
      const pid = s.players[Math.floor(s.qPos / s.attemptsPerPlayer)].id
      const attempts = {
        ...s.attempts,
        [pid]: [...(s.attempts[pid] ?? []), a.result],
      }
      const qPos = s.qPos + 1
      const next: State = { ...s, attempts, qPos, qRunning: false }
      if (qPos < s.players.length * s.attemptsPerPlayer) return next
      const ranked = rankPlayers(s.players, attempts).map((x) => x.player)
      const top = ranked.slice(0, bracketSize(ranked.length))
      return {
        ...next,
        phase: "bracket",
        rounds: buildBracket(top),
        r: 0,
        d: 0,
        champion: null,
        championBoy: false,
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
      if (!nextRound)
        return {
          ...next,
          champion: winner,
          // Сторона 1 в паре — игрок с мальчиком (controls p2)
          championBoy: match?.winner === 1,
        }
      return { ...next, r: s.r + 1, d: 0 }
    }
    case "reset":
      return initialState(s.players, s.nextId, s.attemptsPerPlayer)
  }
}

type ScreenProps = {
  name: string
  controls: Controls
  look: Look
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

export function StageIntro({
  title,
  kicker = "Этап турнира",
  onDone,
}: {
  title: string
  kicker?: string
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
    <div className="nk-stage-intro" role="status" aria-live="assertive">
      <span className="nk-stage-intro__kicker">{kicker}</span>
      <b className="nk-stage-intro__title">{title}</b>
      <span className="nk-versus__hint">Нажмите любую клавишу</span>
    </div>
  )
}

export function GameScreen({
  name,
  controls,
  look,
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
      look,
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
  }, [controls, seed, name, duel, look])

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
    <div className="nk-card p-4">
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
  const [character, setCharacter] = useState(DEFAULT_CHARACTER)

  if (s.phase === "setup") {
    const n = s.players.length
    const perPlayer = s.attemptsPerPlayer
    return (
      <div className="nk-card space-y-4 p-6">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            dispatch({ type: "add", name, character })
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
        <CharacterSelect
          value={character}
          onChange={setCharacter}
          label="Персонаж участника"
        />
        <ol className="space-y-2">
          {s.players.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span>
                {i + 1}. {p.name}{" "}
                <span className="opacity-60">
                  ({characterName(p.character)})
                </span>
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
        <div className="space-y-2">
          <span className="font-semibold">Попыток на отборе</span>
          <fieldset className="flex gap-2" aria-label="Попыток на отборе">
            {ATTEMPT_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={perPlayer === value}
                className={`nk-btn nk-btn--sm ${
                  perPlayer === value ? "nk-btn--lime" : "nk-btn--ghost"
                }`}
                onClick={() => dispatch({ type: "setAttempts", value })}
              >
                {value}
              </button>
            ))}
          </fieldset>
        </div>
        <p className="nk-muted text-sm">
          Участников: {n}. Каждый делает {perPlayer} {attemptsWord(perPlayer)}.
          В турнир выходят до {MAX_BRACKET} лучших (минимум 2 участника).
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
    const perPlayer = s.attemptsPerPlayer
    const player = s.players[Math.floor(s.qPos / perPlayer)]
    const attemptNo = (s.qPos % perPlayer) + 1
    return (
      <div className="space-y-4">
        {s.introSeen === "" && (
          <StageIntro
            title="ОТБОР"
            onDone={() => dispatch({ type: "introSeen", key: "qual" })}
          />
        )}
        {player &&
          s.introSeen !== "" &&
          s.introSeen !== `q-${Math.floor(s.qPos / perPlayer)}` && (
            <StageIntro
              title={player.name}
              kicker="Приготовиться к старту"
              onDone={() =>
                dispatch({
                  type: "introSeen",
                  key: `q-${Math.floor(s.qPos / perPlayer)}`,
                })
              }
            />
          )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="nk-stage">
            <span className="nk-stage__tag">ОТБОР</span>
            <span className="nk-stage__name">{player?.name}</span>
            <span className="nk-stage__try">
              Попытка {attemptNo} из {perPlayer}
            </span>
          </div>
          {resetButton}
        </div>
        <GameScreen
          key={`q-${s.qPos}`}
          name={player?.name ?? ""}
          controls="solo"
          look={lookOf(player?.character)}
          seed={QUALI_SEEDS[s.qPos % perPlayer]}
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
  const stageKey = `r-${s.r}`
  const stageOpen = !s.champion && s.introSeen !== stageKey

  return (
    <div className="space-y-4">
      {stageOpen && round && (
        <StageIntro
          key={stageKey}
          title={round.name}
          onDone={() => dispatch({ type: "introSeen", key: stageKey })}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="nk-h3">
          {round?.name} · пара {s.d + 1} из {round?.matches.length ?? 0}
        </h2>
        {resetButton}
      </div>

      {!s.champion && round && duel && p0 && p1 && (
        <>
          {!stageOpen && !duel.started && introKey !== pairKey && (
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
              look={lookOf(p0.character)}
              seed={duel.seed}
              duel
              running={live}
              onEnd={() => dispatch({ type: "crash", side: 0 })}
            />
            <GameScreen
              key={`${s.r}-${s.d}-1`}
              name={p1.name}
              controls="p2"
              look={lookOf(p1.character)}
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
        <div className="nk-card nk-podium overflow-hidden text-center">
          <PodiumScene
            className="nk-podium__scene"
            label="Победный танец чемпиона"
            boy={s.championBoy}
          />
        </div>
      )}

      <BracketView rounds={s.rounds} r={s.r} d={s.d} champion={s.champion} />
    </div>
  )
}
