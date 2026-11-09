import { createColumnHelper } from "@tanstack/react-table"
import { PencilIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useCan, useMe } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { useRoles, useUsers } from "./api"
import { ApprovalsCard } from "./ApprovalsCard"
import { CreateRoleDialog } from "./CreateRole"
import { CreateProfileDialog } from "./CreateUser"
import { DropdownsCard } from "./DropdownsCard"
import { SettingsCard } from "./SettingsCard"
import type { Role, User } from "./types"

const userColumnHelper = createColumnHelper<GridFeatures, User>()
const roleColumnHelper = createColumnHelper<GridFeatures, Role>()

// "PRODUCTS" → "Products"
const screenLabel = (screenCode: string) => screenCode.charAt(0) + screenCode.slice(1).toLowerCase()

// Each card shows only with its own VIEW permission. Every user and role is listed; Edit shows only on the ones the
// signed-in user manages (those below their own role), plus their own account.
export function AdminPage() {
  const can = useCan()
  const { data: me } = useMe()
  const format = useFormat()
  const canViewUsers = can("USERS.VIEW")
  const canViewRoles = can("ROLES.VIEW")
  const users = useUsers(canViewUsers)
  const roles = useRoles(canViewRoles)

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
        userColumnHelper.accessor((user) => (user.isDeleted ? "Inactive" : "Active"), { id: "status", header: "Status" }),
        userColumnHelper.accessor("createdAt", { header: "Created", cell: (info) => format.date(info.getValue()) }),
      ]),
    [format],
  )

  const roleColumns = useMemo(
    () =>
      roleColumnHelper.columns([
        roleColumnHelper.accessor("name", {
          header: "Role",
          cell: (info) => (
            <span className="font-medium">
              {info.getValue()}
              {info.row.original.isSystem && <span className="font-normal text-muted-foreground"> (system)</span>}
            </span>
          ),
        }),
        roleColumnHelper.accessor((role) => roles.data?.find((parent) => parent.id === role.parentRoleId)?.name ?? "—", {
          id: "managedBy",
          header: "Managed by",
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
    [users.data, roles.data],
  )

  return (
    <div className="space-y-6">
      <TopBarActions>
        {(canViewUsers || canViewRoles) && <SearchInput placeholder="Search users and roles…" />}
        {canViewUsers && canViewRoles && can("USERS.CREATE") && (
          <CreateProfileDialog roles={roles.data?.filter((role) => role.canManage) ?? []} />
        )}
        {canViewRoles && can("ROLES.CREATE") && <CreateRoleDialog roles={roles.data ?? []} />}
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Admin</h1>

      {canViewUsers && (
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
                can("USERS.EDIT")
                  ? (user) =>
                      (user.canManage || user.id === me?.id) && (
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
      )}

      {canViewRoles && (
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>
              A role is a set of permissions. Admins manage the roles below their own role, and the users in them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataGrid
              columns={roleColumns}
              query={roles}
              label="roles"
              urlKey="roles"
              getRowId={(role) => role.id}
              rowActions={
                can("ROLES.EDIT")
                  ? (role) =>
                      role.canManage && (
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
      )}

      {can("SETTINGS.VIEW") && <SettingsCard />}

      {can("DROPDOWNS.VIEW") && <DropdownsCard />}

      {can("APPROVALS.VIEW") && <ApprovalsCard />}
    </div>
  )
}
