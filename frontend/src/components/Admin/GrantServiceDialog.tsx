import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"
import { api, type Catalog } from "@/lib/api"
import { handleError } from "@/utils"

export function GrantServiceDialog({
  catalog,
  primary,
}: {
  catalog?: Catalog
  primary?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [catalogId, setCatalogId] = useState(catalog ? String(catalog.id) : "")
  const [userId, setUserId] = useState("")
  const [startDate, setStartDate] = useState("")
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: users } = useQuery({
    queryKey: ["users", "all"],
    queryFn: async () =>
      (await UsersService.readUsers({ query: { limit: 500 } })).data,
    enabled: open,
  })

  const { data: catalogs } = useQuery({
    queryKey: ["catalog"],
    queryFn: api.catalog,
    enabled: open && !catalog,
  })
  const selected = catalog ?? catalogs?.find((c) => String(c.id) === catalogId)

  const grant = useMutation({
    mutationFn: () =>
      api.admin.grantService({
        user_id: userId,
        catalog_id: Number(catalogId),
        start_date: startDate || undefined,
      }),
    onSuccess: () => {
      showSuccessToast("Абонемент выдан")
      queryClient.invalidateQueries({ queryKey: ["userServices"] })
      queryClient.invalidateQueries({ queryKey: ["admin-user-services"] })
      setOpen(false)
    },
    onError: handleError.bind(showErrorToast),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={primary ? "default" : "outline"}
          size="sm"
          className={primary ? undefined : "w-full"}
        >
          Выдать абонемент
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Выдать абонемент</DialogTitle>
          <DialogDescription>
            {selected
              ? `${selected.name} — ${selected.price.toLocaleString("ru-RU")} ₽`
              : "Выберите клиента и абонемент"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            grant.mutate()
          }}
        >
          {!catalog && (
            <label className="flex flex-col gap-1 text-sm">
              Абонемент
              <select
                required
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
              >
                <option value="">Выберите абонемент</option>
                {(catalogs ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.price.toLocaleString("ru-RU")} ₽
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            Клиент
            <select
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
            >
              <option value="">Выберите клиента</option>
              {(users?.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {[u.full_name, u.email, u.phone].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Дата начала (необязательно, по умолчанию сегодня)
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <Button
            type="submit"
            disabled={!userId || !catalogId || grant.isPending}
          >
            Выдать
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
