import { createFileRoute } from "@tanstack/react-router"

import { NinjaRunGame } from "@/components/Public/NinjaRunGame"

export const Route = createFileRoute("/_public/ninja-run")({
  component: NinjaRunPage,
  head: () => ({
    meta: [{ title: "Ниндзя Ран — Ninja Club" }],
  }),
})

function NinjaRunPage() {
  return (
    <div className="nk-container max-w-4xl py-12">
      <h1 className="nk-h2 mb-4">Ниндзя Ран</h1>
      <p className="nk-muted mb-8">
        Беги, прыгай, перекатывайся, цепляйся за зиплайны и собирай светящиеся
        кольца.
      </p>
      <NinjaRunGame />
    </div>
  )
}
