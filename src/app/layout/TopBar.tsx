import { ProfileMenu } from "@/app/layout/ProfileMenu"
import { TopBarActionsSlot } from "@/components/TopBarActions"

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-6">
      <TopBarActionsSlot />
      <ProfileMenu />
    </header>
  )
}
