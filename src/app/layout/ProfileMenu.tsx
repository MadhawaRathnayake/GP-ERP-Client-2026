import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon, UserIcon } from "lucide-react"

import { useLogout, useMe } from "@/app/auth"
import { themes, useAppearance, type Mode, type ThemeId } from "@/app/theme"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const modes = [
  { id: "light", label: "Light", icon: SunIcon },
  { id: "dark", label: "Dark", icon: MoonIcon },
  { id: "system", label: "System", icon: MonitorIcon },
] as const

// Picker cells: the check mark is replaced by a highlighted cell, and choosing keeps the menu open to compare.
const cell =
  "justify-center rounded-md border border-transparent py-1.5 pr-1.5 data-[state=checked]:border-ring data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground [&>[data-slot=dropdown-menu-radio-item-indicator]]:hidden"

export function ProfileMenu() {
  const { data: me } = useMe()
  const logout = useLogout()
  const appearance = useAppearance()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="ml-auto rounded-full" aria-label="Open profile menu">
          <Avatar>
            <AvatarFallback>
              <UserIcon className="size-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {me && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="truncate font-medium text-foreground">{me.name}</div>
              <div className="truncate">{me.email}</div>
              <div className="truncate">{me.roleName}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={appearance.mode}
          onValueChange={(value) => appearance.setMode(value as Mode)}
          className="grid grid-cols-3 gap-1 px-1"
        >
          {modes.map(({ id, label, icon: Icon }) => (
            <DropdownMenuRadioItem
              key={id}
              value={id}
              onSelect={(event) => event.preventDefault()}
              className={cn(cell, "flex-col gap-1 text-xs")}
            >
              <Icon />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuLabel className="mt-1">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={appearance.theme}
          onValueChange={(value) => appearance.setTheme(value as ThemeId)}
          className="grid grid-cols-2 gap-1 px-1"
        >
          {themes.map(({ id, label, swatch }) => (
            <DropdownMenuRadioItem
              key={id}
              value={id}
              onSelect={(event) => event.preventDefault()}
              className={cn(cell, "justify-start gap-2 pl-2")}
            >
              <span className={cn("size-3.5 shrink-0 rounded-full ring-1 ring-foreground/15", swatch)} />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
