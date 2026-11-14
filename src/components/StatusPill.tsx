import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const tones = {
  neutral: "bg-foreground/6 text-muted-foreground",
  info: "bg-chart-1/12 text-chart-1",
  good: "bg-status-confirmed/12 text-status-confirmed",
  warn: "bg-chart-3/15 text-chart-3",
  bad: "bg-destructive/10 text-destructive",
}

export type PillTone = keyof typeof tones

// A small rounded label for a status or type; `dot` adds a coloured dot in front (for live states like Active).
export function StatusPill({ tone = "neutral", dot, children }: { tone?: PillTone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
