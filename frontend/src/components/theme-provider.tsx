import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type Theme = "dark" | "light"
export type Palette = "ninja" | "toxic" | "electric" | "sakura" | "dojo"

export const PALETTES: {
  id: Palette
  label: string
  mode: Theme
  a: string
  b: string
}[] = [
  { id: "ninja", label: "Ninja", mode: "dark", a: "#ff5a1f", b: "#c6ff3d" },
  { id: "toxic", label: "Toxic", mode: "dark", a: "#2bff88", b: "#f5ff3d" },
  {
    id: "electric",
    label: "Electric",
    mode: "dark",
    a: "#4d7cff",
    b: "#00f5d4",
  },
  { id: "sakura", label: "Sakura", mode: "dark", a: "#ff3d8b", b: "#ffd166" },
  {
    id: "dojo",
    label: "Dojo (светлая)",
    mode: "light",
    a: "#f4f1ea",
    b: "#e8431a",
  },
]

type ThemeProviderProps = {
  children: React.ReactNode
  defaultPalette?: Palette
  storageKey?: string
}

type ThemeProviderState = {
  palette: Palette
  theme: Theme
  setPalette: (palette: Palette) => void
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
)

const isPalette = (value: string | null): value is Palette =>
  PALETTES.some((p) => p.id === value)

export function ThemeProvider({
  children,
  defaultPalette = "ninja",
  storageKey = "nk-theme",
}: ThemeProviderProps) {
  const [palette, setPaletteState] = useState<Palette>(() => {
    const stored = localStorage.getItem(storageKey)
    return isPalette(stored) ? stored : defaultPalette
  })

  const theme: Theme = PALETTES.find((p) => p.id === palette)?.mode ?? "dark"

  useEffect(() => {
    const root = window.document.documentElement
    root.dataset.theme = palette
    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [palette, theme])

  const setPalette = useCallback(
    (next: Palette) => {
      localStorage.setItem(storageKey, next)
      setPaletteState(next)
    },
    [storageKey],
  )

  const value = useMemo<ThemeProviderState>(
    () => ({
      palette,
      theme,
      setPalette,
      setTheme: (mode: Theme) => {
        if (mode === "light") {
          setPalette("dojo")
        } else if (palette === "dojo") {
          setPalette("ninja")
        }
      },
    }),
    [palette, theme, setPalette],
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
