import { createFileRoute } from "@tanstack/react-router"

import { famousRaces } from "@/content/club"

export const Route = createFileRoute("/_public/competitions")({
  component: CompetitionsPage,
  head: () => ({ meta: [{ title: "Соревнования — Ninja Club" }] }),
})

function CompetitionsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-4xl font-black uppercase">Соревнования</h1>
      <p className="mb-6">{famousRaces}</p>
      {/* TODO: результаты атлетов и анонсы соревнований — материалы от клуба */}
      <p className="text-muted-foreground">
        Результаты наших атлетов и анонсы ближайших стартов скоро появятся
        здесь.
      </p>
    </div>
  )
}
