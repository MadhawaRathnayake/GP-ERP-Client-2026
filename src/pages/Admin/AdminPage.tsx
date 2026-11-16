import { createColumnHelper } from "@tanstack/react-table"
import {
  CheckCheckIcon,
  Building2Icon,
  ListChecksIcon,
  PencilIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import { useMemo, type ReactNode } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { useCan, useMe } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { StatTile } from "@/components/DetailCard"
import { SearchInput } from "@/components/SearchInput"
import { StatusPill } from "@/components/StatusPill"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
        userColumnHelper.accessor((user) => (user.isDeleted ? "Inactive" : "Active"), {
          id: "status",
          header: "Status",
          cell: (info) => (
            <StatusPill tone={info.getValue() === "Active" ? "good" : "neutral"} dot>
              {info.getValue()}
            </StatusPill>
          ),
        }),
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
              {info.row.original.isSystem && (
                <span className="ml-2">
                  <StatusPill tone="info">System</StatusPill>
                </span>
              )}
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

  // Only the sections the user may view, in this order; `?section=` picks one (the first by default). Only that section
  // renders, so the page draws one grid or form at a time.
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("q")?.trim().toLowerCase() ?? ""
  const roleName = (id: string | null) => roles.data?.find((role) => role.id === id)?.name ?? ""
  // Counted on the same values as the grids' columns, so a tab's count matches the rows its grid shows.
  const matches = (values: (string | number)[]) => !search || values.join("\n").toLowerCase().includes(search)
  const userMatches = users.data?.filter((user) =>
    matches([user.name, user.email, user.roleName, user.isDeleted ? "Inactive" : "Active", user.createdAt]),
  ).length
  const roleMatches = roles.data?.filter((role) =>
    matches([
      role.name,
      roleName(role.parentRoleId) || "—",
      role.description ?? "",
      [...new Set(role.permissions.map((key) => screenLabel(key.split(".")[0])))].join(", "),
      role.permissions.length,
      users.data?.filter((user) => user.roleId === role.id).length ?? 0,
    ]),
  ).length

  const sections = [
    canViewUsers && { id: "users", label: "Users", icon: UsersIcon, count: userMatches },
    canViewRoles && { id: "roles", label: "Roles", icon: ShieldCheckIcon, count: roleMatches },
    can("SETTINGS.VIEW") && { id: "settings", label: "Company settings", icon: Building2Icon },
    can("DROPDOWNS.VIEW") && { id: "dropdowns", label: "Dropdowns", icon: ListChecksIcon },
    can("APPROVALS.VIEW") && { id: "approvals", label: "Approvals", icon: CheckCheckIcon },
  ].filter((section) => section !== false)
  const chosen = sections.find((section) => section.id === searchParams.get("section")) ?? sections[0]
  // While searching, stay on the chosen tab if it has matches; otherwise show the first tab that has some.
  const active =
    search && !chosen?.count ? (sections.find((section) => section.count) ?? chosen) : chosen
  // Changing tab keeps the search but sends the grids back to page 1.
  const openSection = (id: string) =>
    setSearchParams((params) => {
      const next = new URLSearchParams({ section: id })
      const q = params.get("q")
      if (q) next.set("q", q)
      return next
    })
  const activeUsers = users.data?.filter((user) => !user.isDeleted).length

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <TopBarActions>
        {(canViewUsers || canViewRoles) && <SearchInput placeholder="Search users and roles…" />}
        {canViewUsers && canViewRoles && can("USERS.CREATE") && (
          <CreateProfileDialog
            roles={roles.data?.filter((role) => role.canManage) ?? []}
            onCreated={() => openSection("users")}
          />
        )}
        {canViewRoles && can("ROLES.CREATE") && (
          <CreateRoleDialog roles={roles.data ?? []} onCreated={() => openSection("roles")} />
        )}
      </TopBarActions>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">People, what they can do, and how the company runs the app.</p>
      </div>

      {(canViewUsers || canViewRoles) && (
        <Card className="grid grid-cols-3 gap-0 divide-x py-0 shadow-card">
          <StatTile icon={UsersIcon} tone="blue" label="Users" value={users.data?.length ?? "—"} />
          <StatTile icon={UserCheckIcon} tone="teal" label="Active" value={activeUsers ?? "—"} />
          <StatTile icon={ShieldCheckIcon} tone="violet" label="Roles" value={roles.data?.length ?? "—"} />
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[14rem_1fr]">
        {/* Section menu: a column on large screens, a scrolling row of tabs on phones. */}
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:self-start lg:px-0">
          {sections.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              aria-current={active?.id === id ? "page" : undefined}
              onClick={() => openSection(id)}
              className={cn(
                // Same look as the main sidebar's current page (its left bar comes from index.css there).
                "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
                active?.id === id
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
              {count !== undefined && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-1.5 text-xs tabular-nums",
                    // While searching, tabs with matches glow with their match count.
                    search && count > 0
                      ? "bg-primary text-primary-foreground shadow-[0_0_0_3px] shadow-primary/25"
                      : "bg-foreground/6",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {active?.id === "users" && (
            <Panel
              icon={UsersIcon}
              tone="bg-chart-1/15 text-chart-1"
              title="Users"
              description="Every user has a role, which decides what they can open and do."
            >
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
            </Panel>
          )}

          {active?.id === "roles" && (
            <Panel
              icon={ShieldCheckIcon}
              tone="bg-chart-5/15 text-chart-5"
              title="Roles"
              description="A role is a set of permissions. Admins manage the roles below their own role, and the users in them."
            >
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
            </Panel>
          )}

          {active?.id === "settings" && <SettingsCard />}
          {active?.id === "dropdowns" && <DropdownsCard />}
          {active?.id === "approvals" && <ApprovalsCard />}
        </div>
      </div>
    </div>
  )
}

// A section card with a coloured icon header, the same look as the detail pages' cards.
function Panel({
  icon: Icon,
  tone,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  tone: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="gap-0 py-0 shadow-card">
      <div className="flex items-start gap-3 border-b px-5 py-4">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tone)}>
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}
