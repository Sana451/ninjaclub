import { useState } from "react"

import { Countdown, GameScreen, WinnerBanner } from "./NinjaRunTournament.js"

type Duel = {
  names: [string, string]
  seed: number
  started: boolean
  winner: 0 | 1 | null
}

function newSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000)
}

export function NinjaRunDuel() {
  const [p1, setP1] = useState("")
  const [p2, setP2] = useState("")
  const [duel, setDuel] = useState<Duel | null>(null)
  const [counting, setCounting] = useState(false)

  if (!duel) {
    const ready = p1.trim() !== "" && p2.trim() !== ""
    return (
      <form
        className="nk-card space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ready) return
          setDuel({
            names: [p1.trim(), p2.trim()],
            seed: newSeed(),
            started: false,
            winner: null,
          })
        }}
      >
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-lime-300 uppercase">
            <span className="grid size-5 place-items-center rounded-full bg-lime-300/15 text-[11px]">
              1
            </span>
            Игрок 1
          </span>
          <input
            className="nk-input w-full"
            value={p1}
            maxLength={24}
            onChange={(e) => setP1(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-pink-400 uppercase">
            <span className="grid size-5 place-items-center rounded-full bg-pink-400/15 text-[11px]">
              2
            </span>
            Игрок 2
          </span>
          <input
            className="nk-input w-full"
            value={p2}
            maxLength={24}
            onChange={(e) => setP2(e.target.value)}
          />
        </label>
        <button type="submit" className="nk-btn nk-btn--lime" disabled={!ready}>
          Создать дуэль
        </button>
      </form>
    )
  }

  const live = duel.started && duel.winner === null
  const onCrash = (side: 0 | 1) =>
    setDuel((d) =>
      d?.started && d.winner === null
        ? { ...d, winner: side === 0 ? 1 : 0 }
        : d,
    )

  return (
    <div className="space-y-4">
      {counting && (
        <Countdown
          onDone={() => {
            setCounting(false)
            setDuel((d) => (d ? { ...d, started: true } : d))
          }}
        />
      )}
      <div className="nk-pair flex flex-col gap-4">
        <GameScreen
          key={`${duel.seed}-0`}
          name={duel.names[0]}
          controls="p1"
          seed={duel.seed}
          duel
          running={live}
          onEnd={() => onCrash(0)}
        />
        <GameScreen
          key={`${duel.seed}-1`}
          name={duel.names[1]}
          controls="p2"
          seed={duel.seed}
          duel
          running={live}
          onEnd={() => onCrash(1)}
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
            Старт
          </button>
        )}
        {live && <p className="nk-muted">Первый, кто врежется, проигрывает.</p>}
        {duel.winner !== null && (
          <WinnerBanner key={`${duel.seed}-w`} name={duel.names[duel.winner]} />
        )}
        {duel.winner !== null && (
          <button
            type="button"
            className="nk-btn nk-btn--lime"
            onClick={() =>
              setDuel({
                ...duel,
                seed: newSeed(),
                started: false,
                winner: null,
              })
            }
          >
            Рестарт
          </button>
        )}
        <button
          type="button"
          className="nk-btn nk-btn--ghost nk-btn--sm"
          onClick={() => setDuel(null)}
        >
          Новая дуэль
        </button>
      </div>
    </div>
  )
}
