import type { ComponentProps } from "react"
import { ArrowLeftIcon, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

const variants = { main: "positive", soft: "soft", danger: "destructive" } as const

interface TopBarButtonProps extends Omit<ComponentProps<typeof Button>, "variant" | "children" | "asChild"> {
  icon: LucideIcon
  label: string
  // main: the page's one next step (green tint) · soft: every other action · danger: delete, cancel, reject.
  tone?: keyof typeof variants
  // Makes it a link.
  to?: string
}

// Every button in the top bar. On phones only the icon shows; the label stays as its accessible name.
// Spreads the rest of its props onto the button, so it works as a dialog's trigger (`<DialogTrigger asChild>`).
export function TopBarButton({ icon: Icon, label, tone = "soft", to, ...props }: TopBarButtonProps) {
  const content = (
    <>
      <Icon />
      <span className="hidden sm:inline">{label}</span>
    </>
  )
  return to ? (
    <Button variant={variants[tone]} aria-label={label} asChild {...props}>
      <Link to={to}>{content}</Link>
    </Button>
  ) : (
    <Button variant={variants[tone]} aria-label={label} {...props}>
      {content}
    </Button>
  )
}

// The first thing in the top bar on every page below a list: `label` is where it goes ("Quotations", "QT-0012").
export function BackButton({ to, label }: { to: string; label: string }) {
  return (
    <Button variant="ghost" aria-label={`Back to ${label}`} asChild>
      <Link to={to}>
        <ArrowLeftIcon />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    </Button>
  )
}
