import { createBrowserRouter } from "react-router-dom"

import { AppLayout } from "@/app/layout/AppLayout"
import { RequirePermission } from "@/app/RequirePermission"
import { NotFoundPage } from "@/components/StatusView"
import { AdminPage } from "@/pages/Admin/AdminPage"
import { EditRolePage } from "@/pages/Admin/EditRolePage"
import { EditUserPage } from "@/pages/Admin/EditUserPage"
import { CategoriesPage } from "@/pages/Categories/CategoriesPage"
import { CreateCustomerPage } from "@/pages/Customers/CreateCustomerPage"
import { CustomerPage } from "@/pages/Customers/CustomerPage"
import { CustomersPage } from "@/pages/Customers/CustomersPage"
import { EditCustomerPage } from "@/pages/Customers/EditCustomerPage"
import { DashboardPage } from "@/pages/Dashboard/DashboardPage"
import { LoginPage } from "@/pages/Login/LoginPage"
import { CreateProductPage } from "@/pages/Products/CreateProductPage"
import { EditProductPage } from "@/pages/Products/EditProductPage"
import { ProductPage } from "@/pages/Products/ProductPage"
import { ProductsPage } from "@/pages/Products/ProductsPage"
import { ReportPage } from "@/pages/Reports/ReportPage"
import { SuppliersPage } from "./pages/Suppliers/SuppliersPage"
import { SupplierPage } from "./pages/Suppliers/SupplierPage"
import { EditSupplierPage } from "./pages/Suppliers/EditSupplierPage"
import { CreateSupplierPage } from "./pages/Suppliers/CreateSupplierPage"

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
        path: "products/create",
        element: (
          <RequirePermission permission="PRODUCTS.CREATE">
            <CreateProductPage />
          </RequirePermission>
        ),
      },
      {
        path: "products/categories",
        element: (
          <RequirePermission permission="PRODUCTS.VIEW">
            <CategoriesPage />
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
        path: "customers/create",
        element: (
          <RequirePermission permission="CUSTOMERS.CREATE">
            <CreateCustomerPage />
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
        path: "customers/:id/edit",
        element: (
          <RequirePermission permission="CUSTOMERS.EDIT">
            <EditCustomerPage />
          </RequirePermission>
        ),
      },
      {
        path: "suppliers",
        element: (
          <RequirePermission permission="SUPPLIERS.VIEW">
            <SuppliersPage />
          </RequirePermission>
        ),
      },
      {
        path: "suppliers/:id",
        element: (
          <RequirePermission permission="SUPPLIERS.VIEW">
            <SupplierPage />
          </RequirePermission>
        ),
      },
      {
        path: "suppliers/create",
        element: (
          <RequirePermission permission="SUPPLIERS.CREATE">
            <CreateSupplierPage />
          </RequirePermission>
        ),
      },
      {
        path: "suppliers/:id/edit",
        element: (
          <RequirePermission permission="SUPPLIERS.EDIT">
            <EditSupplierPage />
          </RequirePermission>
        )
      },
      {
        path: "reports",
        element: (
          <RequirePermission permission="REPORTS.VIEW">
            <ReportPage />
          </RequirePermission>
        ),
      },
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
