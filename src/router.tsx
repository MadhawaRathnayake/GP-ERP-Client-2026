import { lazy } from "react"
import { createBrowserRouter } from "react-router-dom"
import { AppLayout } from "@/app/layout/AppLayout"
import { adminPermissions } from "@/app/layout/navigation"
import { RequirePermission } from "@/app/RequirePermission"
import { NotFoundPage } from "@/components/StatusView"
import { LoginPage } from "@/pages/Login/LoginPage"

const AdminPage = lazy(() => import("@/pages/Admin/AdminPage").then((m) => ({ default: m.AdminPage })))
const EditRolePage = lazy(() => import("@/pages/Admin/EditRolePage").then((m) => ({ default: m.EditRolePage })))
const EditUserPage = lazy(() => import("@/pages/Admin/EditUserPage").then((m) => ({ default: m.EditUserPage })))
const AccessoriesPage = lazy(() => import("@/pages/Accessories/AccessoriesPage").then((m) => ({ default: m.AccessoriesPage })))
const CategoriesPage = lazy(() => import("@/pages/Categories/CategoriesPage").then((m) => ({ default: m.CategoriesPage })))
const SerialItemPage = lazy(() => import("@/pages/SerialItems/SerialItemPage").then((m) => ({ default: m.SerialItemPage })))
const SerialItemsPage = lazy(() => import("@/pages/SerialItems/SerialItemsPage").then((m) => ({ default: m.SerialItemsPage })))
const CreateCustomerPage = lazy(() => import("@/pages/Customers/CreateCustomerPage").then((m) => ({ default: m.CreateCustomerPage })))
const CustomerPage = lazy(() => import("@/pages/Customers/CustomerPage").then((m) => ({ default: m.CustomerPage })))
const CustomersPage = lazy(() => import("@/pages/Customers/CustomersPage").then((m) => ({ default: m.CustomersPage })))
const EditCustomerPage = lazy(() => import("@/pages/Customers/EditCustomerPage").then((m) => ({ default: m.EditCustomerPage })))
const DashboardPage = lazy(() => import("@/pages/Dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })))
const DeliveryNotePage = lazy(() => import("@/pages/DeliveryNotes/DeliveryNotePage").then((m) => ({ default: m.DeliveryNotePage })))
const DeliveryNotesPage = lazy(() => import("@/pages/DeliveryNotes/DeliveryNotesPage").then((m) => ({ default: m.DeliveryNotesPage })))
const CreateInvoicePage = lazy(() => import("@/pages/Invoices/CreateInvoicePage").then((m) => ({ default: m.CreateInvoicePage })))
const EditInvoicePage = lazy(() => import("@/pages/Invoices/EditInvoicePage").then((m) => ({ default: m.EditInvoicePage })))
const InvoicePage = lazy(() => import("@/pages/Invoices/InvoicePage").then((m) => ({ default: m.InvoicePage })))
const InvoiceSerialsPage = lazy(() => import("@/pages/Invoices/InvoiceSerialsPage").then((m) => ({ default: m.InvoiceSerialsPage })))
const InvoicesPage = lazy(() => import("@/pages/Invoices/InvoicesPage").then((m) => ({ default: m.InvoicesPage })))
const CreateInternalRequisitionPage = lazy(() => import("@/pages/InternalRequisitions/CreateInternalRequisitionPage").then((m) => ({ default: m.CreateInternalRequisitionPage })))
const EditInternalRequisitionPage = lazy(() => import("@/pages/InternalRequisitions/EditInternalRequisitionPage").then((m) => ({ default: m.EditInternalRequisitionPage })))
const InternalRequisitionPage = lazy(() => import("@/pages/InternalRequisitions/InternalRequisitionPage").then((m) => ({ default: m.InternalRequisitionPage })))
const InternalRequisitionsPage = lazy(() => import("@/pages/InternalRequisitions/InternalRequisitionsPage").then((m) => ({ default: m.InternalRequisitionsPage })))
const CreatePurchaseOrderPage = lazy(() => import("@/pages/PurchaseOrders/CreatePurchaseOrderPage").then((m) => ({ default: m.CreatePurchaseOrderPage })))
const EditPurchaseOrderPage = lazy(() => import("@/pages/PurchaseOrders/EditPurchaseOrderPage").then((m) => ({ default: m.EditPurchaseOrderPage })))
const PurchaseOrderPage = lazy(() => import("@/pages/PurchaseOrders/PurchaseOrderPage").then((m) => ({ default: m.PurchaseOrderPage })))
const PurchaseOrdersPage = lazy(() => import("@/pages/PurchaseOrders/PurchaseOrdersPage").then((m) => ({ default: m.PurchaseOrdersPage })))
const CreateGoodsReceivedNotePage = lazy(() => import("@/pages/GoodsReceivedNotes/CreateGoodsReceivedNotePage").then((m) => ({ default: m.CreateGoodsReceivedNotePage })))
const GoodsReceivedNoteSerialsPage = lazy(() => import("@/pages/GoodsReceivedNotes/GoodsReceivedNoteSerialsPage").then((m) => ({ default: m.GoodsReceivedNoteSerialsPage })))
const GoodsReceivedNotePage = lazy(() => import("@/pages/GoodsReceivedNotes/GoodsReceivedNotePage").then((m) => ({ default: m.GoodsReceivedNotePage })))
const GoodsReceivedNotesPage = lazy(() => import("@/pages/GoodsReceivedNotes/GoodsReceivedNotesPage").then((m) => ({ default: m.GoodsReceivedNotesPage })))
const CreateProductPage = lazy(() => import("@/pages/Products/CreateProductPage").then((m) => ({ default: m.CreateProductPage })))
const EditProductPage = lazy(() => import("@/pages/Products/EditProductPage").then((m) => ({ default: m.EditProductPage })))
const ProductPage = lazy(() => import("@/pages/Products/ProductPage").then((m) => ({ default: m.ProductPage })))
const ProductsPage = lazy(() => import("@/pages/Products/ProductsPage").then((m) => ({ default: m.ProductsPage })))
const CreateQuotationPage = lazy(() => import("@/pages/Quotations/CreateQuotationPage").then((m) => ({ default: m.CreateQuotationPage })))
const EditQuotationPage = lazy(() => import("@/pages/Quotations/EditQuotationPage").then((m) => ({ default: m.EditQuotationPage })))
const QuotationPage = lazy(() => import("@/pages/Quotations/QuotationPage").then((m) => ({ default: m.QuotationPage })))
const QuotationsPage = lazy(() => import("@/pages/Quotations/QuotationsPage").then((m) => ({ default: m.QuotationsPage })))
const ReportPage = lazy(() => import("@/pages/Reports/ReportPage").then((m) => ({ default: m.ReportPage })))
const SuppliersPage = lazy(() => import("@/pages/Suppliers/SuppliersPage").then((m) => ({ default: m.SuppliersPage })))
const SupplierPage = lazy(() => import("@/pages/Suppliers/SupplierPage").then((m) => ({ default: m.SupplierPage })))
const EditSupplierPage = lazy(() => import("@/pages/Suppliers/EditSupplierPage").then((m) => ({ default: m.EditSupplierPage })))
const CreateSupplierPage = lazy(() => import("@/pages/Suppliers/CreateSupplierPage").then((m) => ({ default: m.CreateSupplierPage })))

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
        path: "products/accessories",
        element: (
          <RequirePermission permission="ACCESSORIES.VIEW">
            <AccessoriesPage />
          </RequirePermission>
        ),
      },
      {
        path: "serial-items",
        element: (
          <RequirePermission permission="SERIAL_ITEMS.VIEW">
            <SerialItemsPage />
          </RequirePermission>
        ),
      },
      {
        path: "serial-items/:id",
        element: (
          <RequirePermission permission="SERIAL_ITEMS.VIEW">
            <SerialItemPage />
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
        path: "invoices/:id/serials",
        element: (
          <RequirePermission permission="INVOICES.ADD_SERIALS">
            <InvoiceSerialsPage />
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
        path: "internal-requisitions",
        element: (
          <RequirePermission permission="INTERNAL_REQUISITIONS.VIEW">
            <InternalRequisitionsPage />
          </RequirePermission>
        ),
      },
      {
        path: "internal-requisitions/create",
        element: (
          <RequirePermission permission="INTERNAL_REQUISITIONS.CREATE">
            <CreateInternalRequisitionPage />
          </RequirePermission>
        ),
      },
      {
        path: "internal-requisitions/:id",
        element: (
          <RequirePermission permission="INTERNAL_REQUISITIONS.VIEW">
            <InternalRequisitionPage />
          </RequirePermission>
        ),
      },
      {
        path: "internal-requisitions/:id/edit",
        element: (
          <RequirePermission permission="INTERNAL_REQUISITIONS.EDIT">
            <EditInternalRequisitionPage />
          </RequirePermission>
        ),
      },
      {
        path: "purchase-orders",
        element: (
          <RequirePermission permission="PURCHASE_ORDERS.VIEW">
            <PurchaseOrdersPage />
          </RequirePermission>
        ),
      },
      {
        path: "purchase-orders/create",
        element: (
          <RequirePermission permission="PURCHASE_ORDERS.CREATE">
            <CreatePurchaseOrderPage />
          </RequirePermission>
        ),
      },
      {
        path: "purchase-orders/:id",
        element: (
          <RequirePermission permission="PURCHASE_ORDERS.VIEW">
            <PurchaseOrderPage />
          </RequirePermission>
        ),
      },
      {
        path: "purchase-orders/:id/edit",
        element: (
          <RequirePermission permission="PURCHASE_ORDERS.EDIT">
            <EditPurchaseOrderPage />
          </RequirePermission>
        ),
      },
      {
        path: "goods-received-notes",
        element: (
          <RequirePermission permission="GOODS_RECEIVED_NOTES.VIEW">
            <GoodsReceivedNotesPage />
          </RequirePermission>
        ),
      },
      {
        path: "goods-received-notes/create",
        element: (
          <RequirePermission permission="GOODS_RECEIVED_NOTES.CREATE">
            <CreateGoodsReceivedNotePage />
          </RequirePermission>
        ),
      },
      {
        path: "goods-received-notes/:id",
        element: (
          <RequirePermission permission="GOODS_RECEIVED_NOTES.VIEW">
            <GoodsReceivedNotePage />
          </RequirePermission>
        ),
      },
      {
        path: "goods-received-notes/:id/serials",
        element: (
          <RequirePermission permission="GOODS_RECEIVED_NOTES.ADD_SERIALS">
            <GoodsReceivedNoteSerialsPage />
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
