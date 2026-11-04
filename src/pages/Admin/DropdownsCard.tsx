import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { useCan } from "@/app/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useRoles, useUpdateUserDropdown, useUserDropdowns, useUsers } from "./api"
import type { Role, User, UserDropdown } from "./types"

const schema = z.object({
  source: z.enum(["users", "roles"]),
  userIds: z.array(z.string()),
  roleIds: z.array(z.string()),
})

type DropdownValues = z.infer<typeof schema>

// Shown on the admin screen with DROPDOWNS.VIEW; saving needs DROPDOWNS.EDIT.
export function DropdownsCard() {
  const dropdowns = useUserDropdowns()
  const users = useUsers()
  const roles = useRoles()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dropdowns</CardTitle>
        <CardDescription>
          Which users each dropdown in the app offers: picked one by one, or everyone with a picked role. Deactivated
          users never show.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {dropdowns.isError || users.isError || roles.isError ? (
          <p className="text-sm text-destructive">
            Could not load dropdowns: {(dropdowns.error ?? users.error ?? roles.error)?.message}
          </p>
        ) : dropdowns.isPending || users.isPending || roles.isPending ? (
          <p className="text-sm text-muted-foreground">Loading dropdowns…</p>
        ) : (
          dropdowns.data.map((dropdown) => (
            <DropdownForm key={dropdown.code} dropdown={dropdown} users={users.data} roles={roles.data} />
          ))
        )}
      </CardContent>
    </Card>
  )
}

// Mounts once everything has loaded, so the form starts with the saved values.
function DropdownForm({ dropdown, users, roles }: { dropdown: UserDropdown; users: User[]; roles: Role[] }) {
  const can = useCan()
  const canEdit = can("DROPDOWNS.EDIT")
  const updateDropdown = useUpdateUserDropdown()
  const form = useForm<DropdownValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: dropdown.source, userIds: dropdown.userIds, roleIds: dropdown.roleIds },
  })
  const [source, userIds, roleIds] = useWatch({ control: form.control, name: ["source", "userIds", "roleIds"] })

  const activeUsers = users.filter((user) => !user.isDeleted)
  const offered =
    source === "users"
      ? activeUsers.filter((user) => userIds.includes(user.id))
      : activeUsers.filter((user) => roleIds.includes(user.roleId))

  // A picked user who has since been deactivated is dropped: the server only accepts active users.
  const onSubmit = (values: DropdownValues) => {
    const changes = { ...values, userIds: values.userIds.filter((id) => activeUsers.some((user) => user.id === id)) }
    updateDropdown.mutate({ code: dropdown.code, ...changes }, { onSuccess: () => form.reset(changes) })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border-t pt-4 first:border-t-0 first:pt-0">
        <h3 className="font-medium">{dropdown.label}</h3>
        <fieldset disabled={!canEdit} className="space-y-4">
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Offers</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="users">Selected users</SelectItem>
                    <SelectItem value="roles">Users with selected roles</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {source === "users" ? (
            <FormField
              control={form.control}
              name="userIds"
              render={({ field }) => (
                <FormItem>
                  <CheckList
                    options={activeUsers.map((user) => ({ id: user.id, label: `${user.name} (${user.roleName})` }))}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={!canEdit}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="roleIds"
              render={({ field }) => (
                <FormItem>
                  <CheckList
                    options={roles.map((role) => ({ id: role.id, label: role.name }))}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={!canEdit}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </fieldset>
        <p className="text-sm text-muted-foreground">
          {offered.length > 0 ? `Shows: ${offered.map((user) => user.name).join(", ")}` : "Shows no one yet."}
        </p>
        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={!form.formState.isDirty || updateDropdown.isPending}>
              {updateDropdown.isPending ? "Saving…" : "Save dropdown"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}

interface CheckListProps {
  options: { id: string; label: string }[]
  value: readonly string[]
  onChange: (ids: string[]) => void
  disabled: boolean
}

function CheckList({ options, value, onChange, disabled }: CheckListProps) {
  const idPrefix = useId()
  const toggle = (id: string, checked: boolean) => onChange(checked ? [...value, id] : value.filter((picked) => picked !== id))

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => {
        const id = `${idPrefix}-${option.id}`
        return (
          <div key={option.id} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={value.includes(option.id)}
              disabled={disabled}
              onCheckedChange={(checked) => toggle(option.id, checked === true)}
            />
            <Label htmlFor={id} className="font-normal">
              {option.label}
            </Label>
          </div>
        )
      })}
    </div>
  )
}
