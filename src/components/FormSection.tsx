import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

// The red star after a required field's label.
export function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  )
}

// One part of a create/edit form (customer, supplier): its title on the left from `lg` (on top below it), its fields
// three-up on the right. A form's sections share one card, split by lines (`<Card className="gap-0 divide-y py-0">`). Full class names, so Tailwind finds them.
const sectionTones = {
  blue: "bg-chart-1/15 text-chart-1",
  teal: "bg-chart-2/15 text-chart-2",
  amber: "bg-chart-3/18 text-chart-3",
  rose: "bg-chart-4/15 text-chart-4",
  violet: "bg-chart-5/15 text-chart-5",
}

interface FormSectionProps {
  title: string
  description: string
  icon: LucideIcon
  tone: keyof typeof sectionTones
  children: ReactNode
}

export function FormSection({ title, description, icon: Icon, tone, children }: FormSectionProps) {
  return (
    <section className="grid gap-4 p-5 lg:grid-cols-[14rem_1fr] lg:gap-8">
      <div className="flex items-start gap-3">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", sectionTones[tone])}>
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid content-start gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  )
}
