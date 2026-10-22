import { useEffect, useRef } from "react"

import { mountGame } from "../../../ninja-ui-kit/runner.js"

export function NinjaRunGame() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return mountGame(el)
  }, [])

  return <div ref={ref} className="mx-auto w-full max-w-4xl" />
}
