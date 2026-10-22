import { createFileRoute, Outlet } from "@tanstack/react-router"

import { PublicFooter, PublicHeader } from "@/components/Public/PublicChrome"

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <div className="nk-root flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
