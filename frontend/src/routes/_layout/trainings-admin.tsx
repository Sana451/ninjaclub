import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"
import {
  type FieldDef,
  FormDialog,
  str,
  strOrNull,
  type Values,
} from "@/components/Admin/FormDialog"
import { Button } from "@/components/ui/button"
import { weekdays } from "@/content/club"
import { type AdminTraining, api, hhmm, type WeeklySlot } from "@/lib/api"

export const Route = createFileRoute("/_layout/trainings-admin")({
  component: TrainingsAdminPage,
  beforeLoad: async () => {
    const user = (await UsersService.readUserMe()).data
    if (!user.is_superuser) throw redirect({ to: "/account" })
  },
  head: () => ({ meta: [{ title: "Тренировки (админ) — Ninja Club" }] }),
})

const trainingFields: FieldDef[] = [
  { key: "name", label: "Название", type: "text", required: true },
  { key: "description", label: "Описание", type: "textarea" },
  {
    key: "level",
    label: "Уровень",
    type: "select",
    required: true,
    options: [
      { value: "any", label: "Любой уровень" },
      { value: "beginner", label: "Начинающие" },
      { value: "pro", label: "PRO" },
      { value: "trial", label: "Просмотр" },
    ],
  },
  {
    key: "age_group",
    label: "Возрастная группа (any, 5_6, 7_9, 10_14, pro…)",
    type: "text",
    required: true,
  },
  { key: "color", label: "Цвет в расписании", type: "text", required: true },
  { key: "text_color", label: "Цвет текста", type: "text", required: true },
  { key: "is_personal", label: "Персональная тренировка", type: "checkbox" },
  { key: "is_active", label: "Активна", type: "checkbox" },
]

const trainingValues = (t?: AdminTraining): Values => ({
  name: t?.name ?? "",
  description: t?.description ?? "",
  level: t?.level ?? "any",
  age_group: t?.age_group ?? "any",
  color: t?.color ?? "#d12a10",
  text_color: t?.text_color ?? "#ffffff",
  is_personal: t?.is_personal ?? false,
  is_active: t?.is_active ?? true,
})

const trainingBody = (v: Values) => ({
  name: str(v.name),
  description: strOrNull(v.description),
  level: str(v.level),
  age_group: str(v.age_group),
  color: str(v.color),
  text_color: str(v.text_color),
  is_personal: v.is_personal === true,
  is_active: v.is_active === true,
})

const slotValues = (s?: WeeklySlot): Values => ({
  training_id: s ? String(s.training_id) : "",
  trainer_id: s ? String(s.trainer_id) : "",
  weekday: String(s?.weekday ?? 0),
  time_start: s ? hhmm(s.time_start) : "19:00",
  time_end: s ? hhmm(s.time_end) : "20:30",
  records_limit: String(s?.records_limit ?? 12),
  is_active: s?.is_active ?? true,
})

const slotBody = (v: Values) => ({
  training_id: Number(v.training_id),
  trainer_id: Number(v.trainer_id),
  weekday: Number(v.weekday),
  time_start: str(v.time_start),
  time_end: str(v.time_end),
  records_limit: Number(v.records_limit),
  is_active: v.is_active === true,
})

function TrainingsAdminPage() {
  const queryClient = useQueryClient()
  const { data: trainings } = useQuery({
    queryKey: ["admin-trainings"],
    queryFn: () => api.admin.trainings.list(),
  })
  const { data: slots } = useQuery({
    queryKey: ["admin-weekly-slots"],
    queryFn: () => api.admin.weeklySlots.list(),
  })
  const { data: trainers } = useQuery({
    queryKey: ["admin-trainers"],
    queryFn: () => api.admin.trainers.list(),
  })
  const refresh = () => {
    for (const key of ["admin-trainings", "admin-weekly-slots", "trainings"]) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
  }

  const trainerName = (id: number) => {
    const t = trainers?.find((x) => x.id === id)
    return t ? `${t.surname} ${t.name}` : `#${id}`
  }
  const trainingName = (id: number) =>
    trainings?.find((x) => x.id === id)?.name ?? `#${id}`

  const slotFields: FieldDef[] = [
    {
      key: "training_id",
      label: "Тренировка",
      type: "select",
      required: true,
      options: (trainings ?? []).map((t) => ({
        value: String(t.id),
        label: t.name,
      })),
    },
    {
      key: "trainer_id",
      label: "Тренер",
      type: "select",
      required: true,
      options: (trainers ?? []).map((t) => ({
        value: String(t.id),
        label: `${t.surname} ${t.name}`,
      })),
    },
    {
      key: "weekday",
      label: "День недели",
      type: "select",
      required: true,
      options: weekdays.map((d, i) => ({ value: String(i), label: d })),
    },
    { key: "time_start", label: "Начало", type: "time", required: true },
    { key: "time_end", label: "Конец", type: "time", required: true },
    {
      key: "records_limit",
      label: "Лимит мест",
      type: "number",
      required: true,
      min: 1,
    },
    { key: "is_active", label: "Активно", type: "checkbox" },
  ]

  return (
    <div className="flex flex-col gap-10">
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Тренировки</h1>
          <FormDialog
            title="Новая тренировка"
            trigger={<Button size="sm">Добавить тренировку</Button>}
            fields={trainingFields}
            initial={trainingValues()}
            onSave={(v) => api.admin.trainings.create(trainingBody(v))}
            onSaved={refresh}
          />
        </div>
        <div className="flex flex-col gap-2">
          {(trainings ?? []).map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
            >
              <span
                className="inline-block size-4 rounded"
                style={{ background: t.color }}
              />
              <span className="font-semibold">{t.name}</span>
              <span className="text-sm text-muted-foreground">
                {t.level} · {t.age_group}
              </span>
              {!t.is_active && (
                <span className="text-sm text-muted-foreground">неактивна</span>
              )}
              <FormDialog
                title="Редактирование тренировки"
                trigger={
                  <Button size="sm" variant="outline" className="ml-auto">
                    Изменить
                  </Button>
                }
                fields={trainingFields}
                initial={trainingValues(t)}
                onSave={(v) =>
                  api.admin.trainings.update(t.id, trainingBody(v))
                }
                onSaved={refresh}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Недельное расписание</h2>
          <FormDialog
            title="Новое занятие в расписании"
            trigger={<Button size="sm">Добавить занятие</Button>}
            fields={slotFields}
            initial={slotValues()}
            onSave={(v) => api.admin.weeklySlots.create(slotBody(v))}
            onSaved={refresh}
          />
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Из этих занятий строится расписание на ближайшие недели кнопкой
          «Сгенерировать» на странице «Расписание (админ)».
        </p>
        <div className="flex flex-col gap-2">
          {[...(slots ?? [])]
            .sort(
              (a, b) =>
                a.weekday - b.weekday ||
                a.time_start.localeCompare(b.time_start),
            )
            .map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
              >
                <span className="w-28 font-semibold">
                  {weekdays[s.weekday]}
                </span>
                <span>
                  {hhmm(s.time_start)}–{hhmm(s.time_end)}
                </span>
                <span>{trainingName(s.training_id)}</span>
                <span className="text-sm text-muted-foreground">
                  {trainerName(s.trainer_id)} · мест: {s.records_limit}
                </span>
                {!s.is_active && (
                  <span className="text-sm text-muted-foreground">
                    неактивно
                  </span>
                )}
                <FormDialog
                  title="Редактирование занятия"
                  trigger={
                    <Button size="sm" variant="outline" className="ml-auto">
                      Изменить
                    </Button>
                  }
                  fields={slotFields}
                  initial={slotValues(s)}
                  onSave={(v) =>
                    api.admin.weeklySlots.update(s.id, slotBody(v))
                  }
                  onSaved={refresh}
                />
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}
