import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { levelLabels, weekdaysShort } from "@/content/club"
import { isLoggedIn } from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { api, fullName, hhmm, type ScheduleItem } from "@/lib/api"
import { handleError } from "@/utils"

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const AGE_FILTERS = [
  ["", "Все"],
  ["5_6", "5–6 лет"],
  ["7_9", "7–9 лет"],
  ["10_14", "10–14 лет"],
  ["10_15", "10–15 лет"],
  ["adults", "Взрослые"],
  ["pro", "PRO"],
  ["team", "Команда"],
] as const

export function ScheduleWidget() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [weekOffset, setWeekOffset] = useState(0)
  const [age, setAge] = useState("")
  const [trainer, setTrainer] = useState<number | "">("")
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const [selected, setSelected] = useState(iso(today))
  const changeWeek = (offset: number) => {
    setWeekOffset(offset)
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7)
    setSelected(iso(offset === 0 ? today : monday))
  }
  const from = iso(days[0])
  const to = iso(days[6])

  const trainers = useQuery({ queryKey: ["trainers"], queryFn: api.trainers })
  const schedule = useQuery({
    queryKey: ["schedule", from, to, age, trainer, isLoggedIn()],
    queryFn: () =>
      api.schedule({
        dateFrom: from,
        dateTo: to,
        ageType: age || undefined,
        "trainer[]": trainer === "" ? undefined : [trainer],
      }),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["schedule"] })
    queryClient.invalidateQueries({ queryKey: ["my-registrations"] })
    queryClient.invalidateQueries({ queryKey: ["my-services"] })
  }
  const book = useMutation({
    mutationFn: (id: number) => api.register(id),
    onSuccess: (r) => {
      if (r.status === "fail") showErrorToast(r.message)
      else showSuccessToast(r.message)
      refresh()
    },
    onError: handleError.bind(showErrorToast),
  })
  const cancel = useMutation({
    mutationFn: (id: number) => api.cancel(id),
    onSuccess: (r) => {
      showSuccessToast(r.message)
      refresh()
    },
    onError: handleError.bind(showErrorToast),
  })

  const onBook = (item: ScheduleItem) => {
    if (!isLoggedIn()) {
      navigate({ to: "/login" })
      return
    }
    book.mutate(item.id)
  }

  const items = (schedule.data ?? []).filter((i) => i.date === selected)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={weekOffset === 0}
          onClick={() => changeWeek(weekOffset - 1)}
        >
          ←
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => changeWeek(weekOffset + 1)}
        >
          →
        </Button>
        <span className="text-sm font-medium">
          {days[0].toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
          })}
          {" – "}
          {days[6].toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
          })}
        </span>
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        >
          {AGE_FILTERS.map(([v, l]) => (
            <option key={v} value={v} className="bg-background text-foreground">
              {l}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          value={trainer}
          onChange={(e) =>
            setTrainer(e.target.value === "" ? "" : Number(e.target.value))
          }
        >
          <option value="" className="bg-background text-foreground">
            Все тренеры
          </option>
          {(trainers.data ?? []).map((t) => (
            <option
              key={t.id}
              value={t.id}
              className="bg-background text-foreground"
            >
              {fullName(t)}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-6 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = iso(d)
          const active = key === selected
          return (
            <button
              type="button"
              key={key}
              onClick={() => setSelected(key)}
              className={`rounded-lg border px-1 py-2 text-center text-xs sm:text-sm ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
            >
              <div className="font-semibold">
                {weekdaysShort[(d.getDay() + 6) % 7]}
              </div>
              <div>{d.getDate()}</div>
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-3">
        {schedule.isLoading && <p>Загрузка…</p>}
        {!schedule.isLoading && items.length === 0 && (
          <p className="text-muted-foreground">В этот день занятий нет</p>
        )}
        {items.map((i) => {
          const free = i.records_limit - i.records_current
          return (
            <div
              key={i.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4"
              style={{ borderLeft: `6px solid ${i.color}` }}
            >
              <div className="w-28 font-mono text-lg font-bold">
                {hhmm(i.time_start)}–{hhmm(i.time_end)}
              </div>
              <div className="min-w-48 flex-1">
                <div className="font-semibold">{i.name}</div>
                <div className="text-sm text-muted-foreground">
                  {fullName(i.trainer)} · {levelLabels[i.level] ?? i.level}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {free > 0 ? `Мест: ${free}` : "Мест нет"}
              </div>
              {i.sign_id ? (
                <Button
                  variant="outline"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate(i.id)}
                >
                  {i.sign_status === "waiting"
                    ? "В листе ожидания · Отменить"
                    : "Вы записаны · Отменить"}
                </Button>
              ) : (
                <Button disabled={book.isPending} onClick={() => onBook(i)}>
                  {free > 0 ? "Записаться" : "В лист ожидания"}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
