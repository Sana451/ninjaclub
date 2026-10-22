import { createFileRoute, Outlet } from "@tanstack/react-router"
import { CursorShuriken } from "@/components/Public/CursorShuriken"
import { PageDecor } from "@/components/Public/PageDecor"
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
      <main className="relative isolate flex-1">
        <PageDecor />
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
