import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useState } from "react"

import { UsersService } from "@/client"
import { GrantServiceDialog } from "@/components/Admin/GrantServiceDialog"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { api, type UserService } from "@/lib/api"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/user-services")({
  component: UserServicesPage,
  beforeLoad: async () => {
    const user = (await UsersService.readUserMe()).data
    if (!user.is_superuser) throw redirect({ to: "/account" })
  },
  head: () => ({ meta: [{ title: "Абонементы клиентов — Ninja Club" }] }),
})

const STATUSES = [
  { value: "pending", label: "Ожидает оплаты" },
  { value: "active", label: "Активен" },
  { value: "closed", label: "Закрыт" },
  { value: "expired", label: "Истёк" },
]

function UserServicesPage() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { data } = useQuery({
    queryKey: ["admin-user-services"],
    queryFn: () => api.admin.userServices(),
  })
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-user-services"] })
  const activate = useMutation({
    mutationFn: (id: number) => api.admin.activateService(id),
    onSuccess: () => {
      showSuccessToast("Абонемент активирован")
      invalidate()
    },
    onError: handleError.bind(showErrorToast),
  })
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Абонементы клиентов</h1>
        <GrantServiceDialog primary />
      </div>
      <div className="flex flex-col gap-2">
        {(data ?? []).map((s) => (
          <ServiceRow
            key={s.id}
            service={s}
            onActivate={() => activate.mutate(s.id)}
            onSaved={() => {
              showSuccessToast("Абонемент сохранён")
              invalidate()
            }}
            onError={handleError.bind(showErrorToast)}
          />
        ))}
      </div>
    </div>
  )
}

function ServiceRow({
  service: s,
  onActivate,
  onSaved,
  onError,
}: {
  service: UserService
  onActivate: () => void
  onSaved: () => void
  onError: (err: Error) => void
}) {
  const [visitsLeft, setVisitsLeft] = useState(
    s.visits_left == null ? "" : String(s.visits_left),
  )
  const [endDate, setEndDate] = useState(s.end_date ?? "")
  const [status, setStatus] = useState(s.status)
  const save = useMutation({
    mutationFn: () =>
      api.admin.updateUserService(s.id, {
        visits_left: visitsLeft === "" ? null : Number(visitsLeft),
        end_date: endDate === "" ? null : endDate,
        status,
      }),
    onSuccess: onSaved,
    onError,
  })
  const inputClass =
    "h-9 rounded-md border bg-background px-3 text-sm text-foreground"
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-semibold">{s.catalog.name}</span>
        <span>{s.price.toLocaleString("ru-RU")} ₽</span>
        {(s.user_full_name || s.user_email) && (
          <span className="text-sm text-muted-foreground">
            {[s.user_full_name, s.user_email].filter(Boolean).join(" · ")}
          </span>
        )}
        {s.status === "pending" && (
          <Button size="sm" className="ml-auto" onClick={onActivate}>
            Активировать (оплачено)
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Осталось занятий
          <input
            type="number"
            min={0}
            placeholder="∞"
            value={visitsLeft}
            onChange={(e) => setVisitsLeft(e.target.value)}
            className={`${inputClass} w-32`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Действует до
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Статус
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {STATUSES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          Сохранить
        </Button>
      </div>
    </div>
  )
}
