import { useSearchParams } from "react-router-dom"
import { DataTable, type Column } from "@/components/DataTable"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccounts, useRoles } from "@/hooks/useAdmin"
import type { Account, Role } from "@/types/admin"
import { CreateRoleDialog } from "./CreateRole"
import { CreateProfileDialog } from "./CreateUser"

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
