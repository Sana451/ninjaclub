import { createFileRoute } from "@tanstack/react-router"

import { ClubMap } from "@/components/Public/ClubMap"
import { SocialIcons } from "@/components/Public/PublicChrome"
import { RequestForm } from "@/components/Public/RequestDialog"
import { club } from "@/content/club"

export const Route = createFileRoute("/_public/contacts")({
  component: ContactsPage,
  head: () => ({ meta: [{ title: "Контакты — Ninja Club" }] }),
})

function ContactsPage() {
  return (
    <div className="nk-container grid gap-10 py-12 md:grid-cols-2">
      <div>
        <h1 className="nk-h2 mb-6">Контакты</h1>
        <p className="mb-2">{club.address}</p>
        <p className="mb-2">Работаем ежедневно: {club.hours}</p>
        <p className="mb-2">
          Телефон, Telegram:{" "}
          <a className="nk-link" href={club.phoneHref}>
            {club.phone}
          </a>
        </p>
        <p className="mb-2">
          Почта:{" "}
          <a className="nk-link" href={`mailto:${club.email}`}>
            {club.email}
          </a>
        </p>
        <div className="mt-4">
          <SocialIcons />
        </div>
        {/* TODO: станции метро и подсказка «как пройти» — нужны от клуба */}
        <div className="mt-6">
          <ClubMap />
        </div>
      </div>
      <div className="nk-card p-8">
        <h2 className="nk-h3 mb-4">Отправьте заявку</h2>
        <RequestForm />
      </div>
    </div>
  )
}
