import { zodResolver } from "@hookform/resolvers/zod"
import { ShieldPlusIcon, UserPlusIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useSearchParams } from "react-router-dom"
import { z } from "zod"

import { DataTable, type Column } from "@/components/DataTable"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccounts, useCreateAccount, useCreateRole, useRoles } from "@/hooks/useAdmin"
import type { Account, NewAccount, Role } from "@/types/admin"

export function AdminPage() {
  const accounts = useAccounts()
  const roles = useRoles()
  const roleList = roles.data ?? []
  const accountList = accounts.data ?? []
  const roleName = (roleId: string) => roleList.find((role) => role.id === roleId)?.name ?? "—"

  // Filters the cached query data client-side; typing never triggers a refetch.
  const [searchParams] = useSearchParams()
  const q = (searchParams.get("q") ?? "").trim().toLowerCase()
  const matches = (...fields: string[]) => !q || fields.some((field) => field.toLowerCase().includes(q))
  const filteredAccounts = accountList.filter((account) =>
    matches(
      account.name,
      account.email,
      roleName(account.roleId),
      account.status,
      new Date(account.createdAt).toLocaleDateString(),
    ),
  )
  const filteredRoles = roleList.filter((role) => matches(role.name, role.description))

  const accountColumns: Column<Account>[] = [
    {
      header: "Name",
      cell: (account) => (
        <div>
          <div className="font-medium">{account.name}</div>
          <div className="text-muted-foreground">{account.email}</div>
        </div>
      ),
    },
    { header: "Role", cell: (account) => roleName(account.roleId) },
    { header: "Status", cell: (account) => <span className="capitalize">{account.status}</span> },
    { header: "Created", cell: (account) => new Date(account.createdAt).toLocaleDateString() },
  ]

  const roleColumns: Column<Role>[] = [
    { header: "Role", cell: (role) => <span className="font-medium">{role.name}</span> },
    {
      header: "Description",
      cell: (role) => <span className="whitespace-normal text-muted-foreground">{role.description || "—"}</span>,
    },
    { header: "Accounts", cell: (role) => accountList.filter((account) => account.roleId === role.id).length },
  ]

  return (
    <div className="space-y-6">
      <TopBarActions>
        <SearchInput placeholder="Search accounts and roles…" />
        <CreateProfileDialog roles={roleList} />
        <CreateRoleDialog />
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Admin</h1>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>User profiles and the role assigned to each.</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.isPending ? (
            <p className="text-sm text-muted-foreground">Loading accounts…</p>
          ) : accounts.isError ? (
            <p className="text-sm text-destructive">Could not load accounts: {accounts.error.message}</p>
          ) : filteredAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{q ? "No accounts match your search." : "No accounts yet."}</p>
          ) : (
            <DataTable columns={accountColumns} data={filteredAccounts} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>Roles define what an account can access.</CardDescription>
        </CardHeader>
        <CardContent>
          {roles.isPending ? (
            <p className="text-sm text-muted-foreground">Loading roles…</p>
          ) : roles.isError ? (
            <p className="text-sm text-destructive">Could not load roles: {roles.error.message}</p>
          ) : filteredRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{q ? "No roles match your search." : "No roles yet."}</p>
          ) : (
            <DataTable columns={roleColumns} data={filteredRoles} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const statuses = ["active", "inactive"] as const satisfies readonly NewAccount["status"][]

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("Enter a valid email address"),
  roleId: z.string().min(1, "Select a role"),
  status: z.enum(statuses),
})

type ProfileValues = z.infer<typeof profileSchema>

function CreateProfileDialog({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false)
  const createAccount = useCreateAccount()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "", roleId: "", status: "active" },
  })

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) form.reset()
  }

  const onSubmit = (values: ProfileValues) => {
    createAccount.mutate(values, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={roles.length === 0}>
          <UserPlusIcon />
          New profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create profile</DialogTitle>
          <DialogDescription>Add a user account and assign it a role.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
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
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={createAccount.isPending}>
                {createAccount.isPending ? "Creating…" : "Create profile"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const roleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required"),
  description: z.string().trim(),
})

type RoleValues = z.infer<typeof roleSchema>

function CreateRoleDialog() {
  const [open, setOpen] = useState(false)
  const createRole = useCreateRole()
  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "" },
  })

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) form.reset()
  }

  const onSubmit = (values: RoleValues) => {
    createRole.mutate(values, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ShieldPlusIcon />
          New role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
          <DialogDescription>Roles can be assigned to profiles once created.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending ? "Creating…" : "Create role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
