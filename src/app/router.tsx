import { createBrowserRouter } from "react-router-dom"

import { AppLayout } from "@/app/layout/AppLayout"
import { AdminPage } from "@/pages/Admin/AdminPage"
import { CreatePage } from "@/pages/CreatePage"
import { DashboardPage } from "@/pages/Dashboard/DashboardPage"
import { ItemPage } from "@/pages/ItemPage"
import { ListingPage } from "@/pages/ListingPage"
import { ProfilePage } from "@/pages/Profile/ProfilePage"
import { ReportPage } from "@/pages/Reports/ReportPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "items", element: <ListingPage /> },
      { path: "items/new", element: <CreatePage /> },
      { path: "items/:id", element: <ItemPage /> },
      { path: "reports", element: <ReportPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "admin", element: <AdminPage /> },
    ],
  },
])
