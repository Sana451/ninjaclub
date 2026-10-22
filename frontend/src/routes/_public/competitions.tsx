import { createFileRoute } from "@tanstack/react-router"

import { famousRaces } from "@/content/club"

export const Route = createFileRoute("/_public/competitions")({
  component: CompetitionsPage,
  head: () => ({ meta: [{ title: "Соревнования — Ninja Club" }] }),
})

function CompetitionsPage() {
  return (
    <div className="nk-container max-w-4xl py-12">
      <h1 className="nk-h2 mb-6">Соревнования</h1>
      <p className="mb-6">{famousRaces}</p>
      {/* TODO: результаты атлетов и анонсы соревнований — материалы от клуба */}
      <p className="nk-muted">
        Результаты наших атлетов и анонсы ближайших стартов скоро появятся
        здесь.
      </p>
    </div>
  )
}
