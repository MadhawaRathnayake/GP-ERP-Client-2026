import { useId } from "react"

import type { PermissionKey } from "@/app/auth"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import { usePermissions } from "./api"
import type { Permission } from "./types"

interface PermissionListProps {
  value: readonly PermissionKey[]
  onChange: (permissions: PermissionKey[]) => void
}

// "PRODUCTS" → "Products"
const screenLabel = (screenCode: string) => screenCode.charAt(0) + screenCode.slice(1).toLowerCase()

// Keeps the server's order (screen by screen).
function groupByScreen(permissions: Permission[]) {
  const groups = new Map<string, Permission[]>()
  for (const permission of permissions) {
    groups.set(permission.screenCode, [...(groups.get(permission.screenCode) ?? []), permission])
  }
  return [...groups]
}

// Checkbox for every permission in the database, grouped by screen, used to pick a role's permissions.
export function PermissionList({ value, onChange }: PermissionListProps) {
  const idPrefix = useId()
  const permissions = usePermissions()

  if (permissions.isPending) return <p className="text-sm text-muted-foreground">Loading permissions…</p>
  if (permissions.isError) {
    return <p className="text-sm text-destructive">Could not load permissions: {permissions.error.message}</p>
  }

  const toggle = (key: PermissionKey, checked: boolean) => {
    onChange(checked ? [...value, key] : value.filter((granted) => granted !== key))
  }

  return (
    <div className="space-y-4">
      {groupByScreen(permissions.data).map(([screenCode, items]) => (
        <fieldset key={screenCode} className="space-y-3">
          <legend className="text-sm font-medium">{screenLabel(screenCode)}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((permission) => {
              const id = `${idPrefix}-${permission.key}`
              return (
                <div key={permission.key} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={value.includes(permission.key)}
                    onCheckedChange={(checked) => toggle(permission.key, checked === true)}
                  />
                  <Label htmlFor={id} className="font-normal">
                    {permission.description}
                  </Label>
                </div>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
