import { createFileRoute } from "@tanstack/react-router"

import { ScheduleWidget } from "@/components/Public/ScheduleWidget"
import { levelLabels } from "@/content/club"

export const Route = createFileRoute("/_public/schedule")({
  component: SchedulePage,
  head: () => ({
    meta: [{ title: "Расписание тренировок — Ninja Club" }],
  }),
})

function SchedulePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-4xl font-black uppercase">Расписание</h1>
      <ul className="mb-8 space-y-1 text-sm text-muted-foreground">
        <li>
          <b>{levelLabels.beginner}</b> — группы для новичков, можно в первый
          раз.
        </li>
        <li>
          <b>{levelLabels.pro}</b> — только для опытных спортсменов, нельзя в
          первый раз.
        </li>
        <li>
          <b>{levelLabels.any}</b> — можно приходить с любым уровнем подготовки.
        </li>
        <li>Запись на тренировки обязательна!</li>
      </ul>
      <ScheduleWidget />
    </div>
  )
}
