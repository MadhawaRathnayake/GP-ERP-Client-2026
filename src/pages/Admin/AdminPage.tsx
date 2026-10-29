import { createColumnHelper } from "@tanstack/react-table"
import { PencilIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { useRoles, useUsers } from "./api"
import { CreateRoleDialog } from "./CreateRole"
import { CreateProfileDialog } from "./CreateUser"
import { SettingsCard } from "./SettingsCard"
import type { Role, User } from "./types"

const userColumnHelper = createColumnHelper<GridFeatures, User>()
const roleColumnHelper = createColumnHelper<GridFeatures, Role>()

// "PRODUCTS" → "Products"
const screenLabel = (screenCode: string) => screenCode.charAt(0) + screenCode.slice(1).toLowerCase()

export function AdminPage() {
  const can = useCan()
  const format = useFormat()
  const users = useUsers()
  const roles = useRoles()

  // Rebuilt only when the data they use changes, so the grids keep stable columns.
  const userColumns = useMemo(
    () =>
      userColumnHelper.columns([
        // Name and email in one column so a search matches either.
        userColumnHelper.accessor((user) => `${user.name} ${user.email}`, {
          id: "name",
          header: "Name",
          cell: ({ row }) => (
            <div>
              <div className="font-medium">{row.original.name}</div>
              <div className="text-muted-foreground">{row.original.email}</div>
            </div>
          ),
        }),
        userColumnHelper.accessor("roleName", { header: "Role" }),
        userColumnHelper.accessor((user) => (user.isActive ? "Active" : "Inactive"), { id: "status", header: "Status" }),
        userColumnHelper.accessor("createdAt", { header: "Created", cell: (info) => format.date(info.getValue()) }),
      ]),
    [format],
  )

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
        // The screens the role reaches, e.g. "Dashboard, Products".
        roleColumnHelper.accessor(
          (role) => [...new Set(role.permissions.map((key) => screenLabel(key.split(".")[0])))].join(", "),
          {
            id: "screens",
            header: "Screens",
            cell: (info) => <span className="whitespace-normal">{info.getValue() || "—"}</span>,
          },
        ),
        roleColumnHelper.accessor((role) => role.permissions.length, { id: "permissions", header: "Permissions" }),
        roleColumnHelper.accessor((role) => users.data?.filter((user) => user.roleId === role.id).length ?? 0, {
          id: "users",
          header: "Users",
        }),
      ]),
    [users.data],
  )

  return (
    <div className="space-y-6">
      <TopBarActions>
        <SearchInput placeholder="Search users and roles…" />
        {can("ADMIN.MANAGE_USERS") && <CreateProfileDialog roles={roles.data ?? []} />}
        {can("ADMIN.MANAGE_ROLES") && <CreateRoleDialog />}
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Admin</h1>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Every user has a role, which decides what they can open and do.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataGrid
            columns={userColumns}
            query={users}
            label="users"
            urlKey="users"
            getRowId={(user) => user.id}
            rowActions={
              can("ADMIN.MANAGE_USERS")
                ? (user) => (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/users/${user.id}/edit`} aria-label={`Edit ${user.name}`}>
                        <PencilIcon />
                        Edit
                      </Link>
                    </Button>
                  )
                : undefined
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>A role is a set of permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataGrid
            columns={roleColumns}
            query={roles}
            label="roles"
            urlKey="roles"
            getRowId={(role) => role.id}
            rowActions={
              can("ADMIN.MANAGE_ROLES")
                ? (role) => (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/roles/${role.id}/edit`} aria-label={`Edit ${role.name} role`}>
                        <PencilIcon />
                        Edit
                      </Link>
                    </Button>
                  )
                : undefined
            }
          />
        </CardContent>
      </Card>

      <SettingsCard />
    </div>
  )
}
