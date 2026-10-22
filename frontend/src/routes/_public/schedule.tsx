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
    <div className="nk-container max-w-4xl py-12">
      <h1 className="nk-h2 mb-6">Расписание</h1>
      <ul className="nk-muted mb-8 space-y-1 text-sm">
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
