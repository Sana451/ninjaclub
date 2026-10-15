import { createFileRoute, Outlet } from "@tanstack/react-router"

import { PublicFooter, PublicHeader } from "@/components/Public/PublicChrome"

export const Route = createFileRoute("/_public")({
  component: () => (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  ),
})
