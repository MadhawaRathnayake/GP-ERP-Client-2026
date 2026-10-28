import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useParams } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useAccount, useRoles, useUpdateAccount } from "./api"
import type { Account, Role } from "./types"

const statuses = ["active", "inactive"] as const satisfies readonly Account["status"][]

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .regex(/^[\p{L} ]+$/u, "Name can only contain letters"),
  email: z.email("Enter a valid email address"),
  // Blank keeps the current password.
  password: z.union([z.literal(""), z.string().min(8, "Password must be at least 8 characters")]),
  roleId: z.string().min(1, "Select a role"),
  status: z.enum(statuses),
})

type ProfileValues = z.infer<typeof profileSchema>

const toUsername = (name: string) => name.toLowerCase().replace(/\s+/g, "")

export function EditUserPage() {
  const { id = "" } = useParams()
  const account = useAccount(id)
  const roles = useRoles()

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin">
          <ArrowLeftIcon />
          Back to admin
        </Link>
      </Button>
      {account.isPending || roles.isPending ? (
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      ) : account.isError ? (
        <p className="text-sm text-destructive">{account.error.message}</p>
      ) : roles.isError ? (
        <p className="text-sm text-destructive">Could not load roles: {roles.error.message}</p>
      ) : (
        <ProfileForm account={account.data} roles={roles.data} />
      )}
    </div>
  )
}

// Mounts only once the account has loaded, so the form starts with its saved values.
function ProfileForm({ account, roles }: { account: Account; roles: Role[] }) {
  const updateAccount = useUpdateAccount()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: account.name,
      email: account.email,
      password: "",
      roleId: account.roleId,
      status: account.status,
    },
  })

  const onSubmit = ({ password, ...values }: ProfileValues) => {
    updateAccount.mutate(
      { id: account.id, ...values, password: password || undefined },
      { onSuccess: () => form.reset({ ...values, password: "" }) },
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
            <CardDescription>Created {new Date(account.createdAt).toLocaleDateString()}</CardDescription>
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
                  <FormDescription>Leave blank to keep the current password.</FormDescription>
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
                  <FormDescription>The role decides which pages this user can open.</FormDescription>
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
            <Button type="submit" disabled={!form.formState.isDirty || updateAccount.isPending}>
              {updateAccount.isPending ? "Saving…" : "Save profile"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
