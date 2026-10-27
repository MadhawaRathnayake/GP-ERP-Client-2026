import { createContext, useContext, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

interface Slot {
  target: HTMLElement | null
  setTarget: (element: HTMLElement | null) => void
}

const SlotContext = createContext<Slot>({ target: null, setTarget: () => {} })

export function TopBarActionsProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  return <SlotContext.Provider value={{ target, setTarget }}>{children}</SlotContext.Provider>
}

// Rendered once by TopBar: the area that page actions are portalled into.
export function TopBarActionsSlot() {
  const { setTarget } = useContext(SlotContext)
  return <div ref={setTarget} className="flex flex-1 items-center gap-2" />
}

// Wrap page-specific controls in this; they show in the top bar while the page is mounted.
export function TopBarActions({ children }: { children: ReactNode }) {
  const { target } = useContext(SlotContext)
  return target ? createPortal(children, target) : null
}
