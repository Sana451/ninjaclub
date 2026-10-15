import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { api } from "@/lib/api"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/requests")({
  component: RequestsPage,
  beforeLoad: async () => {
    const user = (await UsersService.readUserMe()).data
    if (!user.is_superuser) throw redirect({ to: "/account" })
  },
  head: () => ({ meta: [{ title: "Заявки — Ninja Club" }] }),
})

function RequestsPage() {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()
  const { data } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: api.admin.requests,
  })
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.admin.setRequestStatus(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] }),
    onError: handleError.bind(showErrorToast),
  })
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Заявки с сайта</h1>
      <div className="flex flex-col gap-2">
        {(data ?? []).map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
          >
            <span className="font-semibold">{r.name}</span>
            <a className="text-primary" href={`tel:${r.phone}`}>
              {r.phone}
            </a>
            <span>{r.kind === "kids" ? "Дети" : "Взрослые"}</span>
            <span className="text-sm text-muted-foreground">
              {new Date(r.created_at).toLocaleString("ru-RU")}
            </span>
            <span className="ml-auto">
              {r.status === "new" ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setStatus.mutate({ id: r.id, status: "processed" })
                  }
                >
                  Обработано
                </Button>
              ) : (
                "Обработана"
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
