import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Building blocks of a record's detail page: titled cards of fields, number tiles, and the loading placeholder.

// Full class names, so Tailwind finds them. The chart colours have fixed hues, so every theme keeps them.
const tones = {
  blue: { band: "from-chart-1/10", chip: "bg-chart-1/15 text-chart-1" },
  teal: { band: "from-chart-2/10", chip: "bg-chart-2/15 text-chart-2" },
  amber: { band: "from-chart-3/12", chip: "bg-chart-3/18 text-chart-3" },
  rose: { band: "from-chart-4/10", chip: "bg-chart-4/15 text-chart-4" },
  violet: { band: "from-chart-5/10", chip: "bg-chart-5/15 text-chart-5" },
}

export type Tone = keyof typeof tones

interface DetailCardProps {
  title: string
  icon: LucideIcon
  tone: Tone
  // One column (narrow side cards); otherwise fields go two-up from `sm`.
  single?: boolean
  children: ReactNode
}

export function DetailCard({ title, icon: Icon, tone, single, children }: DetailCardProps) {
  return (
    <Card className="gap-0 py-0 shadow-card">
      <div className={cn("flex items-center gap-3 border-b bg-linear-to-r to-transparent px-5 py-3", tones[tone].band)}>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", tones[tone].chip)}>
          <Icon className="size-4" />
        </span>
        <h2 className="font-medium">{title}</h2>
      </div>
      <dl className={cn("grid gap-x-6 gap-y-4 p-5", !single && "sm:grid-cols-2")}>{children}</dl>
    </Card>
  )
}

// `wide` spans both columns of a two-column card. Empty values (null, undefined, false, "") show a faint dash.
export function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("min-w-0 space-y-1", wide && "sm:col-span-2")}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="break-words">{children == null || children === "" || children === false ? <Empty /> : children}</dd>
    </div>
  )
}

export function Empty() {
  return <span className="text-muted-foreground/60">—</span>
}

export function StatTile({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: Tone; label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tones[tone].chip)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-semibold tabular-nums sm:text-lg">{value}</div>
      </div>
    </div>
  )
}

export function DetailSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label={label}>
      <div className="h-44 animate-pulse rounded-xl bg-foreground/6" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-foreground/6 lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-xl bg-foreground/6" />
      </div>
    </div>
  )
}
