import { club } from "@/content/club"

export function ClubMap({ large = false }: { large?: boolean }) {
  return (
    <div>
      <iframe
        title="Карта: местоположение клуба"
        src={club.mapUrl}
        className={`w-full rounded-xl border ${large ? "h-[28rem]" : "h-72"}`}
        loading="lazy"
      />
      <a
        href={club.mapLink}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-sm text-primary"
      >
        Открыть в Яндекс.Картах
      </a>
    </div>
  )
}
