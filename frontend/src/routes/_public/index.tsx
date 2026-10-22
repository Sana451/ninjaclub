import { createFileRoute, Link } from "@tanstack/react-router"

import { PriceCards, TrainersGrid } from "@/components/Public/Blocks"
import { ClubMap } from "@/components/Public/ClubMap"
import { RequestDialog, RequestForm } from "@/components/Public/RequestDialog"
import { Button } from "@/components/ui/button"
import {
  aboutOcr,
  club,
  famousRaces,
  faq,
  galleryImages,
  goalImages,
  goals,
  popularity,
  promo,
} from "@/content/club"

export const Route = createFileRoute("/_public/")({
  component: Home,
  head: () => ({
    meta: [{ title: "Ninja Club — лучший ниндзя зал в СПб" }],
  }),
})

const MARQUEE_WORDS = [
  "Бег",
  "Стена",
  "Канаты",
  "Турник",
  "Лазание",
  "Баланс",
  "Финиш",
]

function Section({
  id,
  title,
  children,
}: {
  id?: string
  title?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="nk-section nk-container scroll-mt-20">
      {title && <h2 className="nk-h2 mb-10">{title}</h2>}
      {children}
    </section>
  )
}

function Home() {
  return (
    <>
      <section
        className="nk-hero flex min-h-[calc(100svh-8rem)] items-center"
        style={{
          backgroundImage: `url(${club.heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="nk-container relative w-full text-white">
          <span className="nk-badge nk-badge--lime">
            OCR · Ninja · Obstacle Racing
          </span>
          <h1 className="nk-h1 mt-6">
            <span className="nk-accent">Ninja</span>
            <br />
            <span className="nk-accent">Club</span>
          </h1>
          <p className="mt-4 text-3xl font-semibold text-white md:text-4xl">
            гонки с препятствиями для детей и взрослых
          </p>
          <p className="nk-muted mt-4 text-lg">
            Присоединяйтесь к тренировкам для разных возрастных групп.
          </p>
          <div className="mt-8 flex gap-3">
            <RequestDialog
              trigger={
                <Button size="lg" className="nk-btn nk-btn--lime">
                  Записаться
                </Button>
              }
            />
            <Button
              asChild
              size="lg"
              variant="outline"
              className="nk-btn nk-btn--ghost"
            >
              <Link to="/schedule">Смотреть расписание</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="nk-marquee relative z-10 -mt-12" aria-hidden="true">
        <div className="nk-marquee__row">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((w, i) => (
            <span key={`${w}-${i}`} className="nk-marquee__item">
              {w} ✦
            </span>
          ))}
        </div>
      </div>

      <Section id="about" title="Что такое OCR:">
        <div className="grid gap-6 md:grid-cols-2">
          <p>{aboutOcr.ocr}</p>
          <p>{aboutOcr.ninja}</p>
        </div>
        <figure className="mt-10">
          <div className="aspect-video w-full overflow-hidden rounded-xl border bg-black">
            <iframe
              src={club.video.src}
              title={club.video.title}
              className="size-full"
              loading="lazy"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
          <figcaption className="nk-muted mt-2 text-sm">
            {club.video.title}
          </figcaption>
        </figure>
        <h3 className="nk-h3 mt-10 mb-4">{aboutOcr.differenceTitle}</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <p className="nk-card">{aboutOcr.differenceNinja}</p>
          <p className="nk-card">{aboutOcr.differenceOcr}</p>
        </div>
      </Section>

      <Section title="Почему так возрастает популярность Ninja и OCR?">
        <div className="grid gap-4 md:grid-cols-2">
          {popularity.map((p) => (
            <div key={p.year} className="nk-card">
              <span className="nk-badge mb-3">В {p.year} году</span>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
        <p className="nk-muted mt-6">
          <b>Самые известные на сегодняшний день гонки:</b> {famousRaces}
        </p>
      </Section>

      <Section id="price" title="Цены на тренировки">
        <PriceCards />
        <p className="mt-6 text-center">
          <Link to="/price" className="nk-link underline">
            Все цены
          </Link>
        </p>
      </Section>

      <Section title="Какая главная цель тренировок?">
        <div className="grid gap-6">
          {goals.map((g, i) => (
            <div
              key={g.title}
              className="nk-card nk-card--flush grid md:grid-cols-2"
            >
              <div
                className={`flex flex-col justify-center p-6 ${i % 2 === 1 ? "md:order-2" : ""}`}
              >
                <h3 className="nk-h3 mb-2">{g.title}</h3>
                <p className="nk-muted text-sm">{g.text}</p>
              </div>
              {goalImages[i] && (
                <img
                  src={goalImages[i]}
                  alt={g.title}
                  loading="lazy"
                  className={`aspect-[4/3] w-full object-cover ${i % 2 === 1 ? "md:order-1" : ""}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="nk-card mt-10 p-8 text-center">
          <p className="nk-h2 mb-4">{promo}</p>
          <RequestDialog
            trigger={
              <Button className="nk-btn nk-btn--lime">Записаться</Button>
            }
          />
        </div>
      </Section>

      <Section id="gallery" title="Фотографии">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {galleryImages.map((src, i) => {
            const row = Math.floor(i / 2)
            const wide = (i % 2 === 0) === (row % 2 === 0)
            return (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noreferrer"
                className={wide ? "md:col-span-2" : "md:col-span-1"}
              >
                <img
                  src={src}
                  alt="Тренировки в Ninja Club"
                  loading="lazy"
                  className="h-72 w-full rounded-lg object-cover transition hover:opacity-80"
                />
              </a>
            )
          })}
        </div>
      </Section>

      <Section title="Результаты наших атлетов">
        <img
          src={club.resultsImage}
          alt="Результаты наших атлетов"
          loading="lazy"
          className="mx-auto max-h-[600px] rounded-xl"
        />
      </Section>

      <Section id="trainers" title="Наши тренеры">
        <TrainersGrid />
      </Section>

      <Section title="Самые частые вопросы о Ninja">
        <p className="mb-6 text-muted-foreground">
          А еще мы будем рады ответить на ваши вопросы по телефону: {club.phone}
        </p>
        <div className="flex flex-col gap-2">
          {faq.map((f, i) => (
            <details key={f.q} className="nk-card p-4">
              <summary className="cursor-pointer font-semibold">
                {i + 1}. {f.q}
              </summary>
              <p className="nk-muted mt-2 text-sm">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <section
        id="contacts"
        className="nk-hero flex min-h-[75svh] scroll-mt-20 items-center bg-cover px-4 py-14"
        style={{
          backgroundPosition: "center 45%",
          backgroundImage:
            "linear-gradient(to bottom, rgba(15,15,15,0.15), rgba(15,15,15,0.75)), url('/media/IMG_3459.png')",
        }}
      >
        <div className="nk-card mx-auto w-full max-w-lg p-8 backdrop-blur-sm">
          <h2 className="nk-h2 mb-3">
            Запишитесь на первое пробное занятие в группе со скидкой 30%!
          </h2>
          <p className="nk-muted mb-6 text-sm">
            Мы свяжемся с вами в течение часа и подберем тренера, дату и время
          </p>
          <RequestForm />
        </div>
      </section>

      <Section id="map" title="Как нас найти">
        <p className="mb-4 text-lg font-semibold">
          Санкт-Петербург, ул. Народная, д. 55, лит. Т, второй этаж
        </p>
        <ClubMap large />
      </Section>
    </>
  )
}
