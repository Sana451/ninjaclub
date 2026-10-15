import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useState } from "react"

import { UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { api, fullName, hhmm } from "@/lib/api"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/schedule-admin")({
  component: ScheduleAdmin,
  beforeLoad: async () => {
    const user = (await UsersService.readUserMe()).data
    if (!user.is_superuser) throw redirect({ to: "/account" })
  },
  head: () => ({ meta: [{ title: "Расписание (админ) — Ninja Club" }] }),
})

const iso = (d: Date) => d.toISOString().slice(0, 10)

function Registrations({ id }: { id: number }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ["admin-regs", id],
    queryFn: () => api.admin.registrations(id),
  })
  const mark = useMutation({
    mutationFn: ({ regId, attended }: { regId: number; attended: boolean }) =>
      api.admin.markAttended(regId, attended),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-regs", id] }),
  })
  return (
    <ul className="mt-2 flex flex-col gap-1 text-sm">
      {(data ?? []).length === 0 && <li>Никто не записан</li>}
      {(data ?? []).map((r) => (
        <li key={r.id} className="flex items-center gap-3">
          <span>{r.full_name || r.email}</span>
          <span className="text-muted-foreground">{r.phone}</span>
          {r.status === "waiting" ? (
            <span>(лист ожидания)</span>
          ) : (
            <label className="ml-auto flex items-center gap-1">
              <input
                type="checkbox"
                checked={r.attended}
                onChange={(e) =>
                  mark.mutate({ regId: r.id, attended: e.target.checked })
                }
              />
              пришёл
            </label>
          )}
        </li>
      ))}
    </ul>
  )
}

function ScheduleAdmin() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [open, setOpen] = useState<number | null>(null)
  const from = iso(new Date())
  const to = iso(new Date(Date.now() + 13 * 864e5))
  const { data } = useQuery({
    queryKey: ["admin-schedule", from, to],
    queryFn: () => api.admin.schedule(from, to),
  })
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-schedule"] })
  const generate = useMutation({
    mutationFn: () => api.admin.generateSchedule(4),
    onSuccess: (r) => {
      showSuccessToast(r.message)
      refresh()
    },
    onError: handleError.bind(showErrorToast),
  })
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.admin.updateScheduleStatus(id, status),
    onSuccess: refresh,
    onError: handleError.bind(showErrorToast),
  })
  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-bold">Расписание на 2 недели</h1>
        <Button size="sm" onClick={() => generate.mutate()}>
          Сгенерировать на 4 недели
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {(data ?? []).map((i) => (
          <div key={i.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-mono">
                {i.date} {hhmm(i.time_start)}–{hhmm(i.time_end)}
              </span>
              <span className="flex-1">
                {i.name} · {fullName(i.trainer)}
              </span>
              <span>
                {i.records_current}/{i.records_limit}
                {i.waiting_current > 0 && ` (+${i.waiting_current})`}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(open === i.id ? null : i.id)}
              >
                Записанные
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setStatus.mutate({
                    id: i.id,
                    status: i.status === "open" ? "cancelled" : "open",
                  })
                }
              >
                {i.status === "open" ? "Отменить занятие" : "Вернуть"}
              </Button>
            </div>
            {open === i.id && <Registrations id={i.id} />}
          </div>
        ))}
      </div>
    </div>
  )
}
