import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useParams } from "react-router-dom"
import { z } from "zod"

import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useRoles, useUpdateUser, useUser } from "./api"
import type { Role, User } from "./types"

// Shown as a status; saved as `isActive`.
const statuses = ["active", "inactive"] as const

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Use at most 100 characters")
    .regex(/^[\p{L} ]+$/u, "Name can only contain letters"),
  email: z.email("Enter a valid email address"),
  // Blank keeps the current password.
  password: z.union([
    z.literal(""),
    z.string().min(8, "Password must be at least 8 characters").max(200, "Use at most 200 characters"),
  ]),
  roleId: z.string().min(1, "Select a role"),
  status: z.enum(statuses),
})

type ProfileValues = z.infer<typeof profileSchema>

const toUsername = (name: string) => name.toLowerCase().replace(/\s+/g, "")

export function EditUserPage() {
  const { id = "" } = useParams()
  const user = useUser(id)
  const roles = useRoles()

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin">
          <ArrowLeftIcon />
          Back to admin
        </Link>
      </Button>
      {user.isPending || roles.isPending ? (
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      ) : user.isError ? (
        <QueryError error={user.error} />
      ) : roles.isError ? (
        <p className="text-sm text-destructive">Could not load roles: {roles.error.message}</p>
      ) : (
        <ProfileForm user={user.data} roles={roles.data} />
      )}
    </div>
  )
}

// Mounts only once the user has loaded, so the form starts with their saved values.
function ProfileForm({ user, roles }: { user: User; roles: Role[] }) {
  const updateUser = useUpdateUser()
  const format = useFormat()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      password: "",
      roleId: user.roleId,
      status: user.isActive ? "active" : "inactive",
    },
  })

  const onSubmit = ({ password, status, ...values }: ProfileValues) => {
    updateUser.mutate(
      { id: user.id, ...values, isActive: status === "active", password: password || undefined },
      { onSuccess: () => form.reset({ ...values, status, password: "" }) },
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
            <CardDescription>
              {user.id} · created {format.date(user.createdAt)} by {user.createdBy}
              {user.modifiedAt && ` · last changed ${format.dateTime(user.modifiedAt)} by ${user.modifiedBy ?? "—"}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormDescription>Username: {toUsername(field.value) || "—"}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave blank to keep the current password. A new one signs the user out everywhere else.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>The user gets the permissions of this role.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full capitalize">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={!form.formState.isDirty || updateUser.isPending}>
              {updateUser.isPending ? "Saving…" : "Save profile"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
