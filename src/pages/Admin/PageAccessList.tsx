import { useId } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { appPages, type AppPageId } from "@/types/admin"

interface PageAccessListProps {
  legend: string
  value: readonly AppPageId[]
  onChange?: (pages: AppPageId[]) => void
  disabled?: boolean
}

// Checkbox for every page in the app; read-only when `disabled` (e.g. pages coming from a role).
export function PageAccessList({ legend, value, onChange, disabled }: PageAccessListProps) {
  const idPrefix = useId()

  const toggle = (page: AppPageId, checked: boolean) => {
    onChange?.(checked ? [...value, page] : value.filter((id) => id !== page))
  }

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {appPages.map((page) => {
          const id = `${idPrefix}-${page.id}`
          return (
            <div key={page.id} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={value.includes(page.id)}
                disabled={disabled}
                onCheckedChange={(checked) => toggle(page.id, checked === true)}
              />
              <Label htmlFor={id} className="font-normal">
                {page.label}
              </Label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
