import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"
import {
  type FieldDef,
  FormDialog,
  intOrNull,
  str,
  strOrNull,
  type Values,
} from "@/components/Admin/FormDialog"
import { Button } from "@/components/ui/button"
import { type AdminCatalog, api } from "@/lib/api"

export const Route = createFileRoute("/_layout/catalog-admin")({
  component: CatalogAdminPage,
  beforeLoad: async () => {
    const user = (await UsersService.readUserMe()).data
    if (!user.is_superuser) throw redirect({ to: "/account" })
  },
  head: () => ({ meta: [{ title: "Каталог абонементов — Ninja Club" }] }),
})

const categories: Record<string, string> = {
  group: "Групповые",
  personal: "Персональные",
  free_visit: "Пробные",
}

const fields: FieldDef[] = [
  {
    key: "category",
    label: "Категория",
    type: "select",
    required: true,
    options: Object.entries(categories).map(([value, label]) => ({
      value,
      label,
    })),
  },
  { key: "name", label: "Название", type: "text", required: true },
  { key: "description", label: "Описание", type: "textarea" },
  {
    key: "price",
    label: "Цена, ₽",
    type: "number",
    required: true,
    min: 0,
  },
  {
    key: "visits_count",
    label: "Количество занятий (пусто — безлимит)",
    type: "number",
    min: 1,
  },
  {
    key: "valid_days",
    label: "Срок действия, дней",
    type: "number",
    required: true,
    min: 1,
  },
  { key: "is_single", label: "Разовое посещение", type: "checkbox" },
  { key: "sort", label: "Порядок сортировки", type: "number" },
  { key: "is_active", label: "Показывать на сайте", type: "checkbox" },
]

const toValues = (c?: AdminCatalog): Values => ({
  category: c?.category ?? "group",
  name: c?.name ?? "",
  description: c?.description ?? "",
  price: String(c?.price ?? 0),
  visits_count: c?.visits_count == null ? "" : String(c.visits_count),
  valid_days: String(c?.valid_days ?? 30),
  is_single: c?.is_single ?? false,
  sort: String(c?.sort ?? 0),
  is_active: c?.is_active ?? true,
})

const toBody = (v: Values) => ({
  category: str(v.category),
  name: str(v.name),
  description: strOrNull(v.description),
  price: Number(v.price),
  visits_count: intOrNull(v.visits_count),
  valid_days: Number(v.valid_days),
  is_single: v.is_single === true,
  sort: intOrNull(v.sort) ?? 0,
  is_active: v.is_active === true,
})

function CatalogAdminPage() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ["admin-catalog"],
    queryFn: () => api.admin.catalog.list(),
  })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-catalog"] })
    queryClient.invalidateQueries({ queryKey: ["catalog"] })
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Каталог абонементов</h1>
        <FormDialog
          title="Новый абонемент"
          trigger={<Button size="sm">Добавить абонемент</Button>}
          fields={fields}
          initial={toValues()}
          onSave={(v) => api.admin.catalog.create(toBody(v))}
          onSaved={refresh}
        />
      </div>
      <div className="flex flex-col gap-2">
        {(data ?? []).map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
          >
            <span className="font-semibold">{c.name}</span>
            <span>{c.price.toLocaleString("ru-RU")} ₽</span>
            <span className="text-sm text-muted-foreground">
              {categories[c.category] ?? c.category} ·{" "}
              {c.visits_count ?? "безлимит"} зан. · {c.valid_days} дн.
            </span>
            {!c.is_active && (
              <span className="text-sm text-muted-foreground">скрыт</span>
            )}
            <FormDialog
              title="Редактирование абонемента"
              trigger={
                <Button size="sm" variant="outline" className="ml-auto">
                  Изменить
                </Button>
              }
              fields={fields}
              initial={toValues(c)}
              onSave={(v) => api.admin.catalog.update(c.id, toBody(v))}
              onSaved={refresh}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
