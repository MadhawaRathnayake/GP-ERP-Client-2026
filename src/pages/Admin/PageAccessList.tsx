import { useId } from "react"

import { appPages, type AppPageId } from "@/app/layout/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface PageAccessListProps {
  legend: string
  value: readonly AppPageId[]
  onChange: (pages: AppPageId[]) => void
}

// Checkbox for every page in the app, used to pick a role's pages.
export function PageAccessList({ legend, value, onChange }: PageAccessListProps) {
  const idPrefix = useId()

  const toggle = (page: AppPageId, checked: boolean) => {
    onChange(checked ? [...value, page] : value.filter((id) => id !== page))
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {appPages.map((page) => {
          const id = `${idPrefix}-${page.id}`
          return (
            <div key={page.id} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={value.includes(page.id)}
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
