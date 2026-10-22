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
        <div key={t.id} className="nk-card nk-card--flush">
          <Avatar t={t} />
          <div className="p-5">
            <h3 className="nk-h3">{fullName(t)}</h3>
            <span className="nk-badge mt-2 mb-3">{t.function}</span>
            <ul className="nk-muted list-disc space-y-1 pl-4 text-sm">
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
        <div key={c.id} className="nk-card flex flex-col">
          <h3 className="nk-h3">{c.name}</h3>
          <p className="nk-muted text-sm">
            Срок действия{" "}
            {c.valid_days === 30 ? "1 месяц" : `${c.valid_days} дн.`}
          </p>
          <p className="nk-h2 my-4 nk-accent">
            {c.price.toLocaleString("ru-RU")} ₽
          </p>
          <p className="mb-4 flex-1 text-sm">{c.description}</p>
          {/* TODO: реальная покупка абонемента в приложении (оплата, создание UserService).
              Сейчас кнопка ведёт в группу ВКонтакте, как и на сайте клуба. */}
          <a
            href={club.social.vk}
            target="_blank"
            rel="noreferrer"
            className="nk-btn nk-btn--lime text-center text-sm"
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
