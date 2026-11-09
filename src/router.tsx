import { createBrowserRouter } from "react-router-dom"

import { AppLayout } from "@/app/layout/AppLayout"
import { adminPermissions } from "@/app/layout/navigation"
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
import { DeliveryNotePage } from "@/pages/DeliveryNotes/DeliveryNotePage"
import { DeliveryNotesPage } from "@/pages/DeliveryNotes/DeliveryNotesPage"
import { CreateInvoicePage } from "@/pages/Invoices/CreateInvoicePage"
import { EditInvoicePage } from "@/pages/Invoices/EditInvoicePage"
import { InvoicePage } from "@/pages/Invoices/InvoicePage"
import { InvoicesPage } from "@/pages/Invoices/InvoicesPage"
import { LoginPage } from "@/pages/Login/LoginPage"
import { CreateProductPage } from "@/pages/Products/CreateProductPage"
import { EditProductPage } from "@/pages/Products/EditProductPage"
import { ProductPage } from "@/pages/Products/ProductPage"
import { ProductsPage } from "@/pages/Products/ProductsPage"
import { CreateQuotationPage } from "@/pages/Quotations/CreateQuotationPage"
import { EditQuotationPage } from "@/pages/Quotations/EditQuotationPage"
import { QuotationPage } from "@/pages/Quotations/QuotationPage"
import { QuotationsPage } from "@/pages/Quotations/QuotationsPage"
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
        path: "quotations",
        element: (
          <RequirePermission permission="QUOTATIONS.VIEW">
            <QuotationsPage />
          </RequirePermission>
        ),
      },
      {
        path: "quotations/create",
        element: (
          <RequirePermission permission="QUOTATIONS.CREATE">
            <CreateQuotationPage />
          </RequirePermission>
        ),
      },
      {
        path: "quotations/:id",
        element: (
          <RequirePermission permission="QUOTATIONS.VIEW">
            <QuotationPage />
          </RequirePermission>
        ),
      },
      {
        path: "quotations/:id/edit",
        element: (
          <RequirePermission permission="QUOTATIONS.EDIT">
            <EditQuotationPage />
          </RequirePermission>
        ),
      },
      {
        path: "invoices",
        element: (
          <RequirePermission permission="INVOICES.VIEW">
            <InvoicesPage />
          </RequirePermission>
        ),
      },
      {
        // From a quotation (?quotationId=, needs INVOICES.CREATE) or without one (INVOICES.CREATE_DIRECT); the page
        // checks which.
        path: "invoices/create",
        element: (
          <RequirePermission permission="INVOICES.VIEW">
            <CreateInvoicePage />
          </RequirePermission>
        ),
      },
      {
        path: "invoices/:id",
        element: (
          <RequirePermission permission="INVOICES.VIEW">
            <InvoicePage />
          </RequirePermission>
        ),
      },
      {
        path: "invoices/:id/edit",
        element: (
          <RequirePermission permission="INVOICES.EDIT">
            <EditInvoicePage />
          </RequirePermission>
        ),
      },
      {
        path: "delivery-notes",
        element: (
          <RequirePermission permission="DELIVERY_NOTES.VIEW">
            <DeliveryNotesPage />
          </RequirePermission>
        ),
      },
      {
        path: "delivery-notes/:id",
        element: (
          <RequirePermission permission="DELIVERY_NOTES.VIEW">
            <DeliveryNotePage />
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
      {
        path: "admin",
        element: (
          <RequirePermission permission={adminPermissions}>
            <AdminPage />
          </RequirePermission>
        ),
      },
      {
        path: "admin/users/:id/edit",
        element: (
          <RequirePermission permission="USERS.EDIT">
            <EditUserPage />
          </RequirePermission>
        ),
      },
      {
        path: "admin/roles/:id/edit",
        element: (
          <RequirePermission permission="ROLES.EDIT">
            <EditRolePage />
          </RequirePermission>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
