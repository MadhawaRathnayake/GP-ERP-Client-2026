import { createBrowserRouter } from "react-router-dom"

import { AppLayout } from "@/app/layout/AppLayout"
import { RequirePermission } from "@/app/RequirePermission"
import { NotFoundPage } from "@/components/StatusView"
import { AdminPage } from "@/pages/Admin/AdminPage"
import { EditRolePage } from "@/pages/Admin/EditRolePage"
import { EditUserPage } from "@/pages/Admin/EditUserPage"
import { CustomerPage } from "@/pages/Customers/CustomerPage"
import { CustomersPage } from "@/pages/Customers/CustomersPage"
import { DashboardPage } from "@/pages/Dashboard/DashboardPage"
import { LoginPage } from "@/pages/Login/LoginPage"
import { CreateProductPage } from "@/pages/Products/CreateProductPage"
import { EditProductPage } from "@/pages/Products/EditProductPage"
import { ProductPage } from "@/pages/Products/ProductPage"
import { ProductsPage } from "@/pages/Products/ProductsPage"
import { ProfilePage } from "@/pages/Profile/ProfilePage"
import { ReportPage } from "@/pages/Reports/ReportPage"

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    // Everything inside needs a signed-in user (AppLayout redirects to /login), so unknown URLs show 404 only after sign-in.
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <RequirePermission permission="DASHBOARD.VIEW" redirect>
            <DashboardPage />
          </RequirePermission>
        ),
      },
      {
        path: "products",
        element: (
          <RequirePermission permission="PRODUCTS.VIEW">
            <ProductsPage />
          </RequirePermission>
        ),
      },
      {
        path: "products/new",
        element: (
          <RequirePermission permission="PRODUCTS.CREATE">
            <CreateProductPage />
          </RequirePermission>
        ),
      },
      {
        path: "products/:id",
        element: (
          <RequirePermission permission="PRODUCTS.VIEW">
            <ProductPage />
          </RequirePermission>
        ),
      },
      {
        path: "products/:id/edit",
        element: (
          <RequirePermission permission="PRODUCTS.EDIT">
            <EditProductPage />
          </RequirePermission>
        ),
      },
      {
        path: "customers",
        element: (
          <RequirePermission permission="CUSTOMERS.VIEW">
            <CustomersPage />
          </RequirePermission>
        ),
      },
      {
        path: "customers/:id",
        element: (
          <RequirePermission permission="CUSTOMERS.VIEW">
            <CustomerPage />
          </RequirePermission>
        ),
      },
      {
        path: "reports",
        element: (
          <RequirePermission permission="REPORTS.VIEW">
            <ReportPage />
          </RequirePermission>
        ),
      },
      { path: "profile", element: <ProfilePage /> },
      {
        path: "admin",
        element: (
          <RequirePermission permission="ADMIN.VIEW">
            <AdminPage />
          </RequirePermission>
        ),
      },
      {
        path: "admin/users/:id/edit",
        element: (
          <RequirePermission permission="ADMIN.MANAGE_USERS">
            <EditUserPage />
          </RequirePermission>
        ),
      },
      {
        path: "admin/roles/:id/edit",
        element: (
          <RequirePermission permission="ADMIN.MANAGE_ROLES">
            <EditRolePage />
          </RequirePermission>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
