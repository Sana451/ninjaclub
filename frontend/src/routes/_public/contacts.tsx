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
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
      <div>
        <h1 className="mb-6 text-4xl font-black uppercase">Контакты</h1>
        <p className="mb-2">{club.address}</p>
        <p className="mb-2">Работаем ежедневно: {club.hours}</p>
        <p className="mb-2">
          Телефон, Telegram:{" "}
          <a className="text-primary" href={club.phoneHref}>
            {club.phone}
          </a>
        </p>
        <p className="mb-2">
          Почта:{" "}
          <a className="text-primary" href={`mailto:${club.email}`}>
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
      <div className="rounded-xl border bg-card p-8">
        <h2 className="mb-4 text-xl font-bold">Отправьте заявку</h2>
        <RequestForm />
      </div>
    </div>
  )
}
