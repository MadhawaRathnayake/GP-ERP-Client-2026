import { Loader2Icon } from "lucide-react"
import { ProfileMenu } from "@/app/layout/ProfileMenu"
import { TopBarActionsSlot } from "@/components/TopBarActions"
import { useStockChanged } from "../liveStock"

export function TopBar() {
  const stockChanged = useStockChanged()
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-6">
      <TopBarActionsSlot />
      {stockChanged && (
        <span role="status" title="Stock updated" className="flex items-center">
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          <span className="sr-only">Stock updated</span>
        </span>
      )}
      <ProfileMenu />
    </header>
  )
}
