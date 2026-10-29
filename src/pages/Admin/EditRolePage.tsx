import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useParams } from "react-router-dom"
import { z } from "zod"

import type { PermissionKey } from "@/app/auth"
import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { useRole, useUpdateRole } from "./api"
import { PermissionList } from "./PermissionList"
import type { Role } from "./types"

const roleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required").max(60, "Use at most 60 characters"),
  description: z.string().trim().max(500, "Use at most 500 characters"),
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

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin">
          <ArrowLeftIcon />
          Back to admin
        </Link>
      </Button>
      {role.isPending ? (
        <p className="text-sm text-muted-foreground">Loading role…</p>
      ) : role.isError ? (
        <QueryError error={role.error} />
      ) : (
        <div className="grid max-w-5xl items-start gap-4 lg:grid-cols-2">
          <RoleForm role={role.data} />
          <PermissionsForm role={role.data} />
        </div>
      )}
    </div>
  )
}

// Both forms mount only once the role has loaded, so they start with its saved values.
function RoleForm({ role }: { role: Role }) {
  const updateRole = useUpdateRole()
  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: role.name, description: role.description },
  })

  const onSubmit = (values: RoleValues) => {
    updateRole.mutate({ id: role.id, ...values }, { onSuccess: () => form.reset(values) })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Edit role</CardTitle>
            <CardDescription>Changes apply to every user with this role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={!form.formState.isDirty || updateRole.isPending}>
              {updateRole.isPending ? "Saving…" : "Save role"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}

function PermissionsForm({ role }: { role: Role }) {
  const updateRole = useUpdateRole()
  const form = useForm<PermissionsValues>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: { permissions: role.permissions },
  })

  const onSubmit = (values: PermissionsValues) => {
    updateRole.mutate({ id: role.id, ...values }, { onSuccess: () => form.reset(values) })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>What every user with this role can open and do.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <PermissionList value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={!form.formState.isDirty || updateRole.isPending}>
              {updateRole.isPending ? "Saving…" : "Save permissions"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
