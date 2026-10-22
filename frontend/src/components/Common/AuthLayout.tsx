import { Appearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { Mascot } from "@/components/Common/Mascot"
import { PublicHeader } from "@/components/Public/PublicChrome"
import { Footer } from "./Footer"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="nk-root flex min-h-svh flex-col">
      <PublicHeader />
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="bg-card relative hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-8">
          <Mascot />
          <Logo variant="full" className="h-16" />
        </div>
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-end">
            <Appearance />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">{children}</div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  )
}
