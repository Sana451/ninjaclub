import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { FullscreenGame } from "@/components/Public/FullscreenGame"
import { NinjaRunDuel } from "@/components/Public/NinjaRunDuel"
import { NinjaRunGame } from "@/components/Public/NinjaRunGame"
import { NinjaRunTournament } from "@/components/Public/NinjaRunTournament"

export const Route = createFileRoute("/_public/ninja-run")({
  component: NinjaRunPage,
  head: () => ({
    meta: [{ title: "Ниндзя Ран — Ninja Club" }],
  }),
})

type Mode = "free" | "duel" | "tournament"

function NinjaRunPage() {
  const [mode, setMode] = useState<Mode>("free")

  return (
    <div className="nk-container max-w-4xl py-12">
      <h1 className="nk-h2 mb-4">Ниндзя Ран</h1>
      <p className="nk-muted mb-6">
        Беги, прыгай, перекатывайся, цепляйся за зиплайны и собирай светящиеся
        кольца.
      </p>
      <FullscreenGame>
        <div role="tablist" className="nk-tabs mb-8">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "free"}
            className="nk-tab"
            onClick={() => setMode("free")}
          >
            Свободный забег
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "duel"}
            className="nk-tab"
            onClick={() => setMode("duel")}
          >
            1 на 1
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "tournament"}
            className="nk-tab"
            onClick={() => setMode("tournament")}
          >
            Турнир
          </button>
        </div>
        {mode === "free" && <NinjaRunGame />}
        {mode === "duel" && <NinjaRunDuel />}
        {mode === "tournament" && <NinjaRunTournament />}
      </FullscreenGame>
    </div>
  )
}
