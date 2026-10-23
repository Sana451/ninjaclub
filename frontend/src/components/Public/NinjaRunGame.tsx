import { useEffect, useRef } from "react"

import { mountGame } from "./ninja-run/runner.js"

export function NinjaRunGame() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const game = mountGame(el)
    return () => game.dispose()
  }, [])

  return <div ref={ref} className="mx-auto w-full max-w-4xl" />
}
