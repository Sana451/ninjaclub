import { createFileRoute, Outlet } from "@tanstack/react-router"
import { CursorShuriken } from "@/components/Public/CursorShuriken"
import { PublicFooter, PublicHeader } from "@/components/Public/PublicChrome"
import { ScrollProgress } from "@/components/Public/ScrollProgress"

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <div className="nk-root flex flex-col">
      <ScrollProgress />
      <CursorShuriken />
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
