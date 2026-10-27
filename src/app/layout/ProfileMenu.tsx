import { LogOutIcon, UserIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ProfileMenu() {
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
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserIcon />
            Profile settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* No auth yet: replace with a real sign-out once it exists. */}
        <DropdownMenuItem onSelect={() => toast.info("Log out is not wired up yet")}>
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
