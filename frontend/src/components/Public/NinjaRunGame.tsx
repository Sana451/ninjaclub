import { useEffect, useRef, useState } from "react"

import { CharacterSelect } from "./ninja-run/CharacterSelect.js"
import { DEFAULT_CHARACTER, lookOf } from "./ninja-run/characters.js"
import { mountGame } from "./ninja-run/runner.js"

export function NinjaRunGame() {
  const ref = useRef<HTMLDivElement>(null)
  const [character, setCharacter] = useState(DEFAULT_CHARACTER)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const game = mountGame(el, { look: lookOf(character) })
    return () => game.dispose()
  }, [character])

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <CharacterSelect value={character} onChange={setCharacter} compact />
      <div ref={ref} />
    </div>
  )
}
