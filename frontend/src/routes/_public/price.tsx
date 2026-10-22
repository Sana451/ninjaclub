import { createFileRoute } from "@tanstack/react-router"

import { PriceCards } from "@/components/Public/Blocks"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_public/price")({
  component: PricePage,
  head: () => ({ meta: [{ title: "Цены на тренировки — Ninja Club" }] }),
})

function PricePage() {
  const { user } = useAuth()
  return (
    <div className="nk-container py-12">
      <h1 className="nk-h2 mb-8">Цены на тренировки</h1>
      <PriceCards adminGrant={!!user?.is_superuser} />
      <p className="nk-muted mt-8 text-sm">
        Первое пробное занятие в группе со скидкой 30%!
      </p>
    </div>
  )
}
