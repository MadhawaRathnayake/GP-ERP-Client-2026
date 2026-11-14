import { useSyncExternalStore } from "react"

export type Mode = "light" | "dark" | "system"

// `swatch` is the class for the theme's primary colour, shown in the picker.
export const themes = [
  { id: "classic", label: "Classic", swatch: "bg-[oklch(0.53_0.19_262)]" },
  { id: "ocean", label: "Ocean", swatch: "bg-[oklch(0.55_0.15_225)]" },
  { id: "forest", label: "Forest", swatch: "bg-[oklch(0.52_0.13_158)]" },
  { id: "solar", label: "Solar", swatch: "bg-[oklch(0.62_0.17_48)]" },
  { id: "aurora", label: "Aurora", swatch: "bg-[oklch(0.54_0.2_295)]" },
  { id: "paper", label: "Paper", swatch: "bg-[oklch(0.36_0.04_60)]" },
  { id: "midnight", label: "Midnight", swatch: "bg-[oklch(0.22_0.04_265)]" },
] as const

export type ThemeId = (typeof themes)[number]["id"]

// The keys and the way they're applied are repeated in index.html's inline script, which runs before the first paint.
const MODE_KEY = "ui-mode"
const THEME_KEY = "ui-theme"
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)")

// Storage can be unavailable (private mode, blocked site data); the choice then lasts until the page reloads.
function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not remembered; nothing else to do.
  }
}

const storedMode = read(MODE_KEY)
const storedTheme = read(THEME_KEY)
let state: { mode: Mode; theme: ThemeId } = {
  mode: storedMode === "light" || storedMode === "dark" ? storedMode : "system",
  theme: themes.find((theme) => theme.id === storedTheme)?.id ?? "classic",
}
const listeners = new Set<() => void>()

function apply() {
  const root = document.documentElement
  root.classList.toggle("dark", state.mode === "dark" || (state.mode === "system" && darkQuery.matches))
  if (state.theme === "classic") delete root.dataset.theme
  else root.dataset.theme = state.theme
}

function update(next: Partial<typeof state>) {
  state = { ...state, ...next }
  apply()
  listeners.forEach((listener) => listener())
}

apply()
darkQuery.addEventListener("change", () => state.mode === "system" && apply())

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Light / dark / system and the colour theme, for the profile menu and the toasts.
export function useAppearance() {
  const { mode, theme } = useSyncExternalStore(subscribe, () => state)
  return {
    mode,
    theme,
    setMode: (next: Mode) => {
      write(MODE_KEY, next)
      update({ mode: next })
    },
    setTheme: (next: ThemeId) => {
      write(THEME_KEY, next)
      update({ theme: next })
    },
  }
}
