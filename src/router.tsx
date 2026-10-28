import { createBrowserRouter } from "react-router-dom"

import { AppLayout } from "@/app/layout/AppLayout"
import { AdminPage } from "@/pages/Admin/AdminPage"
import { EditRolePage } from "@/pages/Admin/EditRolePage"
import { EditUserPage } from "@/pages/Admin/EditUserPage"
import { DashboardPage } from "@/pages/Dashboard/DashboardPage"
import { CreateProductPage } from "@/pages/Products/CreateProductPage"
import { ProductPage } from "@/pages/Products/ProductPage"
import { ProductsPage } from "@/pages/Products/ProductsPage"
import { ProfilePage } from "@/pages/Profile/ProfilePage"
import { ReportPage } from "@/pages/Reports/ReportPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/new", element: <CreateProductPage /> },
      { path: "products/:id", element: <ProductPage /> },
      { path: "reports", element: <ReportPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "admin/accounts/:id/edit", element: <EditUserPage /> },
      { path: "admin/roles/:id/edit", element: <EditRolePage /> },
    ],
  },
])
