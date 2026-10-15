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
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-black uppercase">Цены на тренировки</h1>
      <PriceCards adminGrant={!!user?.is_superuser} />
      <p className="mt-8 text-sm text-muted-foreground">
        Первое пробное занятие в группе со скидкой 30%!
      </p>
    </div>
  )
}
