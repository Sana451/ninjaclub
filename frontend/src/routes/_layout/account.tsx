import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { api, fullName, hhmm } from "@/lib/api"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/account")({
  component: Account,
  head: () => ({ meta: [{ title: "Мои записи — Ninja Club" }] }),
})

const statusLabel: Record<string, string> = {
  pending: "Ожидает активации",
  active: "Активен",
  closed: "Закрыт",
  expired: "Истёк",
}

function Account() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const registrations = useQuery({
    queryKey: ["my-registrations"],
    queryFn: api.myRegistrations,
  })
  const services = useQuery({
    queryKey: ["my-services"],
    queryFn: api.myServices,
  })
  const cancel = useMutation({
    mutationFn: (id: number) => api.cancel(id),
    onSuccess: (r) => {
      showSuccessToast(r.message)
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] })
      queryClient.invalidateQueries({ queryKey: ["my-services"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl">
          Привет, {user?.full_name || user?.email} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Телефон: {user?.phone || "не указан"}
        </p>
        <div className="mt-3 flex gap-3">
          <Button asChild>
            <Link to="/schedule">Записаться на тренировку</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("access_token")
              window.location.href = "/"
            }}
          >
            Выйти
          </Button>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold">Ближайшие занятия</h2>
        {(registrations.data ?? []).length === 0 && (
          <p className="text-muted-foreground">Записей пока нет</p>
        )}
        <div className="flex flex-col gap-2">
          {(registrations.data ?? []).map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
            >
              <span className="font-mono">
                {r.schedule_item.date} {hhmm(r.schedule_item.time_start)}
              </span>
              <span className="flex-1">
                {r.schedule_item.name} · {fullName(r.schedule_item.trainer)}
                {r.status === "waiting" && " (лист ожидания)"}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancel.mutate(r.schedule_item.id)}
              >
                Отменить
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Мои абонементы</h2>
        {(services.data ?? []).length === 0 && (
          <p className="text-muted-foreground">
            Абонементов нет. Выберите на странице{" "}
            <Link to="/price" className="text-primary underline">
              цен
            </Link>
            .
          </p>
        )}
        <div className="flex flex-col gap-2">
          {(services.data ?? []).map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap gap-4 rounded-lg border p-3"
            >
              <span className="flex-1 font-semibold">{s.catalog.name}</span>
              <span>{statusLabel[s.status] ?? s.status}</span>
              <span>
                Осталось: {s.visits_left ?? "∞"}
                {s.visits_total ? ` из ${s.visits_total}` : ""}
              </span>
              {s.end_date && <span>до {s.end_date}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
