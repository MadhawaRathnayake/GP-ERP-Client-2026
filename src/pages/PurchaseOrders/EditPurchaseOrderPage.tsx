import { ArrowLeftIcon } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { useInternalRequisition } from "@/pages/InternalRequisitions/api"

import { usePurchaseOrder, useUpdatePurchaseOrder } from "./api"
import { PurchaseOrderForm } from "./CreatePurchaseOrderPage"
import { isEditable, type PurchaseOrder } from "./types"

export function EditPurchaseOrderPage() {
  const { id = "" } = useParams()
  const order = usePurchaseOrder(id)

  return (
    <div className="space-y-4">
      <TopBarActions>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/purchase-orders/${id}`}>
            <ArrowLeftIcon />
            Back to purchase order
          </Link>
        </Button>
      </TopBarActions>
      {order.isPending ? (
        <p className="text-sm text-muted-foreground">Loading purchase order…</p>
      ) : order.isError ? (
        <QueryError error={order.error} />
      ) : !isEditable(order.data.status) ? (
        // The server refuses the edit too; say why instead of showing a form that can't be saved.
        <p className="text-sm text-muted-foreground">Only a pending or rejected purchase order can be edited.</p>
      ) : (
        <EditForm order={order.data} />
      )}
    </div>
  )
}

function EditForm({ order }: { order: PurchaseOrder }) {
  const can = useCan()
  const navigate = useNavigate()
  const updateOrder = useUpdatePurchaseOrder()
  // The IR's lines let removed products be added back; without IR access the form edits the PO's own lines only.
  const canViewRequisition = can("INTERNAL_REQUISITIONS.VIEW")
  const requisition = useInternalRequisition(String(order.internalRequisitionId), canViewRequisition)

  if (canViewRequisition && requisition.isPending) return <p className="text-sm text-muted-foreground">Loading internal requisition…</p>
  return (
    <PurchaseOrderForm
      title={`Edit purchase order ${order.purchaseOrderNumber}`}
      // Saving a rejected PO sends it for approval again.
      submitLabel={order.status === "rejected" ? "Save & resubmit" : "Save changes"}
      pending={updateOrder.isPending}
      order={order}
      requisition={canViewRequisition ? requisition.data : undefined}
      onSubmit={(fields) =>
        updateOrder.mutate({ id: order.id, ...fields }, { onSuccess: () => navigate(`/purchase-orders/${order.id}`) })
      }
    />
  )
}
