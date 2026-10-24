import { useState } from "react"

import {
  Countdown,
  GameScreen,
  Versus,
  WinnerBanner,
} from "./NinjaRunTournament.js"
import { CharacterSelect } from "./ninja-run/CharacterSelect.js"
import {
  CHARACTERS,
  DEFAULT_CHARACTER,
  lookOf,
} from "./ninja-run/characters.js"
import { sfx } from "./ninja-run/sound.js"

type Duel = {
  names: [string, string]
  characters: [string, string]
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
  const [c1, setC1] = useState(DEFAULT_CHARACTER)
  const [c2, setC2] = useState(CHARACTERS[1]?.id ?? DEFAULT_CHARACTER)
  const [duel, setDuel] = useState<Duel | null>(null)
  const [counting, setCounting] = useState(false)
  const [introSeen, setIntroSeen] = useState<number | null>(null)

  if (!duel) {
    const ready = p1.trim() !== "" && p2.trim() !== ""
    return (
      <form
        className="nk-card space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ready) return
          sfx("go")
          setDuel({
            names: [p1.trim(), p2.trim()],
            characters: [c1, c2],
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
        <div className="grid gap-2 sm:grid-cols-2">
          <CharacterSelect value={c1} onChange={setC1} label="Игрок 1" />
          <CharacterSelect value={c2} onChange={setC2} label="Игрок 2" />
        </div>
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
      {!duel.started && introSeen !== duel.seed && (
        <Versus
          key={duel.seed}
          left={duel.names[0]}
          right={duel.names[1]}
          onDone={() => setIntroSeen(duel.seed)}
        />
      )}
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
          look={lookOf(duel.characters[0])}
          seed={duel.seed}
          duel
          running={live}
          onEnd={() => onCrash(0)}
        />
        <GameScreen
          key={`${duel.seed}-1`}
          name={duel.names[1]}
          controls="p2"
          look={lookOf(duel.characters[1])}
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
            onClick={() => {
              sfx("go")
              setCounting(true)
            }}
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
            onClick={() => {
              sfx("go")
              setDuel({
                ...duel,
                seed: newSeed(),
                started: false,
                winner: null,
              })
            }}
          >
            Рестарт
          </button>
        )}
        <button
          type="button"
          className="nk-btn nk-btn--ghost nk-btn--sm"
          onClick={() => {
            sfx("back")
            setDuel(null)
          }}
        >
          Новая дуэль
        </button>
      </div>
    </div>
  )
}
