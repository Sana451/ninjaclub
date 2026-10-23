import { type ReactNode, useEffect, useState } from "react"

export function FullscreenGame({ children }: { children: ReactNode }) {
  const [full, setFull] = useState(false)

  useEffect(() => {
    if (!full) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [full])

  return (
    <div className={full ? "nk-fs" : "relative"}>
      <button
        type="button"
        className={`nk-btn nk-btn--ghost nk-btn--sm mb-2${full ? " nk-fs__toggle" : ""}`}
        aria-pressed={full}
        onClick={() => setFull((f) => !f)}
      >
        {full ? "Выйти из полноэкранного режима" : "На весь экран"}
      </button>
      {children}
    </div>
  )
}
