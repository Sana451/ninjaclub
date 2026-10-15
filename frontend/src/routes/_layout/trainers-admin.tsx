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
import { api, type Trainer } from "@/lib/api"

export const Route = createFileRoute("/_layout/trainers-admin")({
  component: TrainersAdminPage,
  beforeLoad: async () => {
    const user = (await UsersService.readUserMe()).data
    if (!user.is_superuser) throw redirect({ to: "/account" })
  },
  head: () => ({ meta: [{ title: "Тренеры (админ) — Ninja Club" }] }),
})

const fields: FieldDef[] = [
  { key: "surname", label: "Фамилия", type: "text", required: true },
  { key: "name", label: "Имя", type: "text", required: true },
  { key: "patronymic", label: "Отчество", type: "text" },
  { key: "function", label: "Должность", type: "text" },
  {
    key: "gender",
    label: "Пол",
    type: "select",
    options: [
      { value: "M", label: "Мужской" },
      { value: "F", label: "Женский" },
    ],
  },
  {
    key: "photo",
    label: "Фото (путь или ссылка, например /media/trainer.jpg)",
    type: "text",
  },
  { key: "description", label: "Описание", type: "textarea" },
  { key: "sort", label: "Порядок сортировки", type: "number" },
  { key: "is_active", label: "Показывать на сайте", type: "checkbox" },
]

const toValues = (t?: Trainer): Values => ({
  surname: t?.surname ?? "",
  name: t?.name ?? "",
  patronymic: t?.patronymic ?? "",
  function: t?.function ?? "",
  gender: t?.gender ?? "",
  photo: t?.photo ?? "",
  description: t?.description ?? "",
  sort: String(t?.sort ?? 0),
  is_active: t?.is_active ?? true,
})

const toBody = (v: Values) => ({
  surname: str(v.surname),
  name: str(v.name),
  patronymic: strOrNull(v.patronymic),
  function: strOrNull(v.function),
  gender: strOrNull(v.gender),
  photo: strOrNull(v.photo),
  description: strOrNull(v.description),
  sort: intOrNull(v.sort) ?? 0,
  is_active: v.is_active === true,
})

function TrainersAdminPage() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ["admin-trainers"],
    queryFn: () => api.admin.trainers.list(),
  })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-trainers"] })
    queryClient.invalidateQueries({ queryKey: ["trainers"] })
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Тренеры</h1>
        <FormDialog
          title="Новый тренер"
          trigger={<Button size="sm">Добавить тренера</Button>}
          fields={fields}
          initial={toValues()}
          onSave={(v) => api.admin.trainers.create(toBody(v))}
          onSaved={refresh}
        />
      </div>
      <div className="flex flex-col gap-2">
        {(data ?? []).map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
          >
            <span className="font-semibold">
              {t.surname} {t.name} {t.patronymic}
            </span>
            <span className="text-sm text-muted-foreground">{t.function}</span>
            {!t.is_active && (
              <span className="text-sm text-muted-foreground">скрыт</span>
            )}
            <FormDialog
              title="Редактирование тренера"
              trigger={
                <Button size="sm" variant="outline" className="ml-auto">
                  Изменить
                </Button>
              }
              fields={fields}
              initial={toValues(t)}
              onSave={(v) => api.admin.trainers.update(t.id, toBody(v))}
              onSaved={refresh}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
