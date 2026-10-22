import { useState } from "react"

import { PALETTES, useTheme } from "@/components/theme-provider"

export function ThemeSwitcher() {
  const { palette, setPalette } = useTheme()
  const [wipeKey, setWipeKey] = useState(0)

  const handleSelect = (id: (typeof PALETTES)[number]["id"]) => {
    if (id === palette) return
    setPalette(id)
    setWipeKey((key) => key + 1)
  }

  return (
    <>
      <div
        key={wipeKey}
        className={wipeKey ? "nk-wipe go" : "nk-wipe"}
        aria-hidden="true"
      />
      <section className="nk-sw" aria-label="Цветовая схема">
        <span>Тема</span>
        {PALETTES.map((p) => (
          <button
            key={p.id}
            type="button"
            data-t={p.id}
            style={{ "--a": p.a, "--b": p.b } as React.CSSProperties}
            aria-label={p.label}
            title={p.label}
            aria-pressed={palette === p.id}
            onClick={() => handleSelect(p.id)}
          />
        ))}
      </section>
    </>
  )
}
