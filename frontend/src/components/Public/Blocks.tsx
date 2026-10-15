import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { GrantServiceDialog } from "@/components/Admin/GrantServiceDialog"
import { club, trainerPhotos } from "@/content/club"
import { api, fullName, type Trainer } from "@/lib/api"

function Avatar({ t }: { t: Trainer }) {
  const [failed, setFailed] = useState(false)
  const photo = trainerPhotos[t.surname] || t.photo
  return photo && !failed ? (
    <img
      src={photo}
      alt={fullName(t)}
      loading="lazy"
      onError={() => setFailed(true)}
      className="aspect-[4/5] w-full object-cover object-top"
    />
  ) : (
    <div className="flex aspect-[4/5] w-full items-center justify-center bg-primary text-5xl font-bold text-primary-foreground">
      {t.surname[0]}
      {t.name[0]}
    </div>
  )
}

export function TrainersGrid() {
  const { data } = useQuery({ queryKey: ["trainers"], queryFn: api.trainers })
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {(data ?? []).map((t) => (
        <div key={t.id} className="overflow-hidden rounded-xl border bg-card">
          <Avatar t={t} />
          <div className="p-5">
            <h3 className="text-lg font-bold">{fullName(t)}</h3>
            <p className="mb-2 text-sm font-medium text-primary">
              {t.function}
            </p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {(t.description ?? "")
                .split(/(?<=\.)\s+/)
                .filter(Boolean)
                .map((sentence) => (
                  <li key={sentence}>{sentence}</li>
                ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PriceCards({ adminGrant = false }: { adminGrant?: boolean }) {
  const { data } = useQuery({ queryKey: ["catalog"], queryFn: api.catalog })
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {(data ?? []).map((c) => (
        <div key={c.id} className="flex flex-col rounded-xl border bg-card p-6">
          <h3 className="text-lg font-bold uppercase">{c.name}</h3>
          <p className="text-sm text-muted-foreground">
            Срок действия{" "}
            {c.valid_days === 30 ? "1 месяц" : `${c.valid_days} дн.`}
          </p>
          <p className="my-4 text-3xl font-black text-primary">
            {c.price.toLocaleString("ru-RU")} ₽
          </p>
          <p className="mb-4 flex-1 text-sm">{c.description}</p>
          {/* TODO: реальная покупка абонемента в приложении (оплата, создание UserService).
              Сейчас кнопка ведёт в группу ВКонтакте, как и на сайте клуба. */}
          <a
            href={club.social.vk}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
          >
            Купить абонемент
          </a>
          {adminGrant && (
            <div className="mt-2">
              <GrantServiceDialog catalog={c} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
