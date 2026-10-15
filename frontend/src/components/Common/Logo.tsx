import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <span
          className={cn(
            "text-lg font-black tracking-wider text-primary group-data-[collapsible=icon]:hidden",
            className,
          )}
        >
          NINJA CLUB
        </span>
        <span
          className={cn(
            "hidden text-lg font-black text-primary group-data-[collapsible=icon]:block",
            className,
          )}
        >
          NC
        </span>
      </>
    ) : (
      <span
        className={cn(
          "text-xl font-black tracking-wider text-primary",
          className,
        )}
      >
        {variant === "full" ? "NINJA CLUB" : "NC"}
      </span>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
