import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useParams } from "react-router-dom"
import { z } from "zod"

import { useMe, type PermissionKey } from "@/app/auth"
import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useCanGrant, useRole, useRoles, useUpdateRole } from "./api"
import { PermissionList } from "./PermissionList"
import { rolesBelow, type Role } from "./types"

const roleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required").max(60, "Use at most 60 characters"),
  description: z.string().trim().max(500, "Use at most 500 characters"),
  branchCode: z.string().trim().regex(/^[A-Z0-9]{1,10}$/, "Up to 10 capital letters or digits, e.g. GP01"),
  parentRoleId: z.string(),
})

type RoleValues = z.infer<typeof roleSchema>

const permissionsSchema = z.object({
  // Picked from GET /permissions, so every value is a valid key.
  permissions: z.array(z.custom<PermissionKey>()),
})

type PermissionsValues = z.infer<typeof permissionsSchema>

export function EditRolePage() {
  const { id = "" } = useParams()
  const role = useRole(id)
  const roles = useRoles()

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin">
          <ArrowLeftIcon />
          Back to admin
        </Link>
      </Button>
      {role.isPending || roles.isPending ? (
        <p className="text-sm text-muted-foreground">Loading role…</p>
      ) : role.isError ? (
        <QueryError error={role.error} />
      ) : roles.isError ? (
        <p className="text-sm text-destructive">Could not load roles: {roles.error.message}</p>
      ) : (
        <div className="grid max-w-5xl items-start gap-4 lg:grid-cols-2">
          <RoleForm role={role.data} roles={roles.data} />
          <PermissionsForm role={role.data} />
        </div>
      )}
    </div>
  )
}

// The system role, and a role outside the signed-in user's branch, are shown read-only; the server refuses changes.
const readOnlyReason = (role: Role) =>
  role.isSystem
    ? "This is the Super Admin role: it has every permission, and nobody can change it."
    : "You can only change the roles under your own role, so this one is read-only for you."

// Both forms mount only once the role has loaded, so they start with its saved values.
function RoleForm({ role, roles }: { role: Role; roles: Role[] }) {
  const { data: me } = useMe()
  const updateRole = useUpdateRole()
  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: role.name, description: role.description, branchCode: role.branchCode, parentRoleId: role.parentRoleId ?? "" },
  })
  const editable = role.canManage
  // Only the Super Admin moves a role, and never under itself or a role below it.
  const canMove = editable && me?.isSuperAdmin === true
  const below = rolesBelow(role.id, roles)
  const parents = roles.filter((other) => other.id !== role.id && !below.has(other.id))
  const parentName = roles.find((other) => other.id === role.parentRoleId)?.name ?? "—"

  const onSubmit = ({ parentRoleId, ...values }: RoleValues) => {
    const changes = { ...values, parentRoleId: parentRoleId === role.parentRoleId ? undefined : parentRoleId }
    updateRole.mutate({ id: role.id, ...changes }, { onSuccess: () => form.reset({ ...values, parentRoleId }) })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{editable ? "Edit role" : "Role"}</CardTitle>
            <CardDescription>{editable ? "Changes apply to every user with this role." : readOnlyReason(role)}</CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset disabled={!editable} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role name</FormLabel>
                    <FormControl>
                      <Input placeholder="Accountant" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="What this role can do" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branchCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch code</FormLabel>
                    <FormControl>
                      <Input placeholder="GP01" {...field} onChange={(event) => field.onChange(event.target.value.toUpperCase())} />
                    </FormControl>
                    <FormDescription>Goes into the invoice numbers this role's users make, e.g. 26NOV_GP01_14.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!role.isSystem && (
                <FormField
                  control={form.control}
                  name="parentRoleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Managed by</FormLabel>
                      {canMove ? (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {parents.map((parent) => (
                              <SelectItem key={parent.id} value={parent.id}>
                                {parent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">{parentName}</p>
                      )}
                      <FormDescription>
                        Admins in this role manage this role and the roles below it. Only the Super Admin can change it.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </fieldset>
          </CardContent>
          {editable && (
            <CardFooter className="mt-4 justify-end">
              <Button type="submit" disabled={!form.formState.isDirty || updateRole.isPending}>
                {updateRole.isPending ? "Saving…" : "Save role"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </form>
    </Form>
  )
}

function PermissionsForm({ role }: { role: Role }) {
  const updateRole = useUpdateRole()
  const canGrant = useCanGrant()
  const form = useForm<PermissionsValues>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: { permissions: role.permissions },
  })
  const editable = role.canManage

  const onSubmit = (values: PermissionsValues) => {
    updateRole.mutate({ id: role.id, ...values }, { onSuccess: () => form.reset(values) })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>
              {role.isSystem
                ? "The Super Admin role always has every permission, including new ones."
                : editable
                  ? "What every user with this role can open and do. You can give only permissions your own role has; Settings, Dropdowns and Approvals only the Super Admin gives."
                  : "What every user with this role can open and do."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <PermissionList value={field.value} onChange={field.onChange} disabled={!editable} canChange={canGrant} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          {editable && (
            <CardFooter className="justify-end">
              <Button type="submit" disabled={!form.formState.isDirty || updateRole.isPending}>
                {updateRole.isPending ? "Saving…" : "Save permissions"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </form>
    </Form>
  )
}
