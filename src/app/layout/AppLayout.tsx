import { Outlet } from "react-router-dom"

import { Sidebar } from "@/app/layout/Sidebar"
import { TopBar } from "@/app/layout/TopBar"

export function AppLayout() {
  return (
    <div className="min-h-svh">
      <Sidebar />
      <div className="pl-56">
        <TopBar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
