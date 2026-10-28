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
import { useAccount, useRoles, useUpdateAccount } from "@/hooks/useAdmin"
import { appPageIds, type Account, type Role } from "@/types/admin"

import { PageAccessList } from "./PageAccessList"

const statuses = ["active", "inactive"] as const satisfies readonly Account["status"][]

// Radix Select cannot hold an empty value, so "no role" is stored as "" in the form and shown as this item.
const NO_ROLE = "none"

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .regex(/^[\p{L} ]+$/u, "Name can only contain letters"),
  email: z.email("Enter a valid email address"),
  // Blank keeps the current password.
  password: z.union([z.literal(""), z.string().min(8, "Password must be at least 8 characters")]),
  roleId: z.string(),
  status: z.enum(statuses),
})

type ProfileValues = z.infer<typeof profileSchema>

const pageAccessSchema = z.object({
  pages: z.array(z.enum(appPageIds)),
})

type PageAccessValues = z.infer<typeof pageAccessSchema>

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
        <div className="grid max-w-5xl items-start gap-4 lg:grid-cols-2">
          <ProfileForm account={account.data} roles={roles.data} />
          <PageAccessForm account={account.data} roles={roles.data} />
        </div>
      )}
    </div>
  )
}

// Both forms mount only once the account has loaded, so they start with its saved values.
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
        <Card>
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
                  <FormLabel>Role (optional)</FormLabel>
                  <Select
                    value={field.value || NO_ROLE}
                    onValueChange={(value) => field.onChange(value === NO_ROLE ? "" : value)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_ROLE}>No role</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Page access below follows the saved role.</FormDescription>
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

function PageAccessForm({ account, roles }: { account: Account; roles: Role[] }) {
  const updateAccount = useUpdateAccount()
  const form = useForm<PageAccessValues>({
    resolver: zodResolver(pageAccessSchema),
    defaultValues: { pages: account.pages },
  })
  // Uses the saved role, so a role change takes effect here only after "Save profile".
  const role = roles.find((role) => role.id === account.roleId)

  const onSubmit = (values: PageAccessValues) => {
    updateAccount.mutate({ id: account.id, ...values }, { onSuccess: () => form.reset(values) })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Page access</CardTitle>
            <CardDescription>
              {role
                ? `Access comes from the ${role.name} role. Set the role to "No role" and save the profile to choose pages for this user.`
                : "This user has no role. Choose the pages they can open."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {role ? (
              <PageAccessList legend={`${role.name} pages`} value={role.pages} disabled />
            ) : (
              <FormField
                control={form.control}
                name="pages"
                render={({ field }) => (
                  <FormItem>
                    <PageAccessList legend="Pages" value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          {!role && (
            <CardFooter className="justify-end">
              <Button type="submit" disabled={!form.formState.isDirty || updateAccount.isPending}>
                {updateAccount.isPending ? "Saving…" : "Save page access"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </form>
    </Form>
  )
}
