import { Link } from "@tanstack/react-router"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { SiTelegram, SiVk } from "react-icons/si"

import { Button } from "@/components/ui/button"
import { club, docs } from "@/content/club"
import { isLoggedIn } from "@/hooks/useAuth"

function MaxIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24C0 10.7452 10.7452 0 24 0ZM24.2314 12.5C17.8663 12.5 12.4942 17.4255 12.4941 23.9727C12.4941 26.714 13.0015 28.6059 13.4482 30.3047C13.8233 31.6836 14.1543 32.9467 14.1543 34.4414C14.3143 36.4326 17.9823 35.2685 19.1406 33.7793C20.9718 35.1031 22.0251 35.4346 24.292 35.4346C30.5586 35.4011 35.6151 30.2999 35.5938 24.0332C35.5937 17.6682 30.602 12.5 24.2314 12.5ZM24.3857 18.1592V18.165C27.5981 18.349 30.0709 21.0719 29.9453 24.2871C29.7296 27.4955 26.9854 29.9406 23.7734 29.7861C22.768 29.7055 21.8016 29.3614 20.9717 28.7881C20.4699 29.2899 19.6648 29.9402 19.3447 29.8633C18.6774 29.6868 17.8938 26.2951 18.335 23.5098C18.87 20.1452 21.2859 17.9993 24.3857 18.1592Z"
      />
    </svg>
  )
}

export function SocialIcons() {
  return (
    <div className="flex items-center gap-3">
      <a
        href={club.social.vk}
        target="_blank"
        rel="noreferrer"
        aria-label="ВКонтакте"
        className="text-muted-foreground hover:text-primary"
      >
        <SiVk className="size-5" />
      </a>
      <a
        href={club.social.telegram}
        target="_blank"
        rel="noreferrer"
        aria-label="Telegram"
        className="text-muted-foreground hover:text-primary"
      >
        <SiTelegram className="size-5" />
      </a>
      <a
        href={club.social.max}
        target="_blank"
        rel="noreferrer"
        aria-label="MAX"
        className="text-muted-foreground hover:text-primary"
      >
        <MaxIcon className="size-5" />
      </a>
    </div>
  )
}

const nav = [
  { to: "/", hash: "about", label: "Об OCR" },
  { to: "/price", label: "Цены" },
  { to: "/schedule", label: "Расписание" },
  { to: "/", hash: "trainers", label: "Тренеры" },
  { to: "/contacts", label: "Контакты" },
  { to: "/competitions", label: "Соревнования" },
] as const

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="text-xl font-black tracking-wider text-primary">
          NINJA CLUB
        </Link>
        <nav className="hidden flex-1 items-center gap-5 text-sm lg:flex">
          {nav.map((i) => (
            <Link
              key={i.label}
              to={i.to}
              hash={"hash" in i ? i.hash : undefined}
              className="hover:text-primary"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden flex-col items-end leading-tight md:flex">
          <a href={club.phoneHref} className="text-sm font-medium">
            {club.phone}
          </a>
          <span className="text-xs text-muted-foreground">{club.hours}</span>
        </div>
        {isLoggedIn() ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/account">Личный кабинет</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Войти</Link>
          </Button>
        )}
        <div className="hidden lg:flex">
          <SocialIcons />
        </div>
        <button
          type="button"
          className="lg:hidden"
          aria-label="Меню"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t px-4 py-4 lg:hidden">
          {nav.map((i) => (
            <Link
              key={i.label}
              to={i.to}
              hash={"hash" in i ? i.hash : undefined}
              onClick={() => setOpen(false)}
            >
              {i.label}
            </Link>
          ))}
          {isLoggedIn() ? (
            <Link to="/account">Личный кабинет</Link>
          ) : (
            <Link to="/login">Войти</Link>
          )}
        </div>
      )}
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="text-xl font-black tracking-wider text-primary">
            NINJA CLUB
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{club.address}</p>
          <p className="text-sm text-muted-foreground">{club.hours}</p>
        </div>
        <div className="text-sm">
          <p>
            Телефон, Telegram:{" "}
            <a className="text-primary" href={club.phoneHref}>
              {club.phone}
            </a>
          </p>
          <p>
            Почта:{" "}
            <a className="text-primary" href={`mailto:${club.email}`}>
              {club.email}
            </a>
          </p>
          <div className="mt-2">
            <SocialIcons />
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Посетителям</span>
          {Object.entries(docs).map(([slug, d]) => (
            <Link
              key={slug}
              to="/docs/$slug"
              params={{ slug }}
              className="text-muted-foreground hover:text-primary"
            >
              {d.title}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
