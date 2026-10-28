import { createColumnHelper } from "@tanstack/react-table"
import { PencilIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { appPages } from "@/app/layout/navigation"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { useAccounts, useRoles } from "./api"
import { CreateRoleDialog } from "./CreateRole"
import { CreateProfileDialog } from "./CreateUser"
import type { Account, Role } from "./types"

const accountColumnHelper = createColumnHelper<GridFeatures, Account>()
const roleColumnHelper = createColumnHelper<GridFeatures, Role>()

export function AdminPage() {
  const accounts = useAccounts()
  const roles = useRoles()

  // Rebuilt only when the data they look up changes, so the grids keep stable columns.
  const accountColumns = useMemo(() => {
    const roleName = (roleId: string) => roles.data?.find((role) => role.id === roleId)?.name ?? "—"
    return accountColumnHelper.columns([
      // Name and email in one column so a search matches either.
      accountColumnHelper.accessor((account) => `${account.name} ${account.email}`, {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-muted-foreground">{row.original.email}</div>
          </div>
        ),
      }),
      accountColumnHelper.accessor((account) => roleName(account.roleId), { id: "role", header: "Role" }),
      accountColumnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <span className="capitalize">{info.getValue()}</span>,
      }),
      accountColumnHelper.accessor("createdAt", {
        header: "Created",
        cell: (info) => new Date(info.getValue()).toLocaleDateString(),
      }),
    ])
  }, [roles.data])

  const roleColumns = useMemo(
    () =>
      roleColumnHelper.columns([
        roleColumnHelper.accessor("name", {
          header: "Role",
          cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        }),
        roleColumnHelper.accessor("description", {
          header: "Description",
          cell: (info) => <span className="whitespace-normal text-muted-foreground">{info.getValue() || "—"}</span>,
        }),
        roleColumnHelper.accessor(
          (role) =>
            appPages
              .filter((page) => role.pages.includes(page.id))
              .map((page) => page.label)
              .join(", "),
          {
            id: "pages",
            header: "Pages",
            cell: (info) => <span className="whitespace-normal">{info.getValue() || "—"}</span>,
          },
        ),
        roleColumnHelper.accessor(
          (role) => accounts.data?.filter((account) => account.roleId === role.id).length ?? 0,
          { id: "accounts", header: "Accounts" },
        ),
      ]),
    [accounts.data],
  )

  return (
    <div className="space-y-6">
      <TopBarActions>
        <SearchInput placeholder="Search accounts and roles…" />
        <CreateProfileDialog roles={roles.data ?? []} />
        <CreateRoleDialog />
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Admin</h1>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>User profiles and the role assigned to each.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataGrid
            columns={accountColumns}
            query={accounts}
            label="accounts"
            urlKey="accounts"
            getRowId={(account) => account.id}
            rowActions={(account) => (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/admin/accounts/${account.id}/edit`} aria-label={`Edit ${account.name}`}>
                  <PencilIcon />
                  Edit
                </Link>
              </Button>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>Roles define what an account can access.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataGrid
            columns={roleColumns}
            query={roles}
            label="roles"
            urlKey="roles"
            getRowId={(role) => role.id}
            rowActions={(role) => (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/admin/roles/${role.id}/edit`} aria-label={`Edit ${role.name} role`}>
                  <PencilIcon />
                  Edit
                </Link>
              </Button>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
