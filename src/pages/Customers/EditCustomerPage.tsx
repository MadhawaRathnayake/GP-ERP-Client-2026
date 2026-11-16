import { useNavigate, useParams } from "react-router-dom"

import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton } from "@/components/TopBarButton"

import { useCustomer, useUpdateCustomer } from "./api"
import { CustomerForm } from "./CreateCustomerPage"

export function EditCustomerPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const customer = useCustomer(id)
  const updateCustomer = useUpdateCustomer()

  return (
    <div className="space-y-4">
      {/* Once loaded, the form puts its own back and save buttons in the top bar. */}
      {!customer.isSuccess && (
        <TopBarActions>
          <BackButton to={`/customers/${id}`} label="Customer" />
        </TopBarActions>
      )}
      {customer.isPending ? (
        <p className="text-sm text-muted-foreground">Loading customer…</p>
      ) : customer.isError ? (
        <QueryError error={customer.error} />
      ) : (
        <CustomerForm
          title={`Edit ${customer.data.code}`}
          back={{ to: `/customers/${id}`, label: customer.data.code }}
          submitLabel="Save changes"
          pending={updateCustomer.isPending}
          customer={customer.data}
          onSubmit={(changes) =>
            updateCustomer.mutate({ id, ...changes }, { onSuccess: () => navigate(`/customers/${id}`) })
          }
        />
      )}
    </div>
  )
}
