import { useEffect, useRef } from "react"
import { CHARACTERS, type Look } from "./characters.js"
import { headPortrait, palette } from "./engine.js"

function HeadCanvas({ look }: { look: Look }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current?.getContext("2d")
    if (!c) return
    c.clearRect(0, 0, 24, 24)
    headPortrait(c, palette(), look)
  }, [look])
  return (
    <canvas
      ref={ref}
      width={24}
      height={24}
      style={{ imageRendering: "pixelated" }}
      className="size-full"
    />
  )
}

export function CharacterSelect({
  value,
  onChange,
  label,
  compact = false,
}: {
  value: string
  onChange: (id: string) => void
  label?: string
  compact?: boolean
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <span className="block text-xs font-bold tracking-[0.15em] uppercase">
          {label}
        </span>
      )}
      <fieldset
        aria-label={label ?? "Персонаж"}
        className={`m-0 min-w-0 border-0 p-0 ${
          compact ? "flex flex-wrap gap-1.5" : "grid grid-cols-5 gap-2"
        }`}
      >
        {CHARACTERS.map((c) => {
          const selected = c.id === value
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected}
              title={c.name}
              onClick={() => onChange(c.id)}
              className={`group relative overflow-hidden rounded-md border-2 bg-black/60 transition ${
                compact ? "size-28" : "aspect-square"
              } ${
                selected
                  ? "border-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.6)]"
                  : "border-white/15 opacity-70 hover:opacity-100"
              }`}
            >
              <HeadCanvas look={c.look} />
              <span
                className={`absolute inset-x-0 bottom-0 truncate bg-black/75 px-1 py-0.5 text-center font-bold text-white ${
                  compact ? "text-sm" : "text-[10px]"
                }`}
              >
                {c.name}
              </span>
            </button>
          )
        })}
      </fieldset>
    </div>
  )
}
