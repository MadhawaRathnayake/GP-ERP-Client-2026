import { useNavigate, useParams } from "react-router-dom"

import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton } from "@/components/TopBarButton"

import { useSupplier, useUpdateSupplier } from "./api"
import { SupplierForm } from "./CreateSupplierPage"

export function EditSupplierPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const supplier = useSupplier(id)
  const updateSupplier = useUpdateSupplier()

  return (
    <div className="space-y-4">
      <TopBarActions>
        <BackButton to={`/suppliers/${id}`} label="Supplier" />
      </TopBarActions>
      {supplier.isPending ? (
        <p className="text-sm text-muted-foreground">Loading supplier…</p>
      ) : supplier.isError ? (
        <QueryError error={supplier.error} />
      ) : (
        <SupplierForm
          title={`Edit ${supplier.data.code}`}
          submitLabel="Save changes"
          pending={updateSupplier.isPending}
          supplier={supplier.data}
          onSubmit={(changes) =>
            updateSupplier.mutate({ id, ...changes }, { onSuccess: () => navigate(`/suppliers/${id}`) })
          }
        />
      )}
    </div>
  )
}
