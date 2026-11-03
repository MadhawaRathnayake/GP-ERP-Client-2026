import { ArrowLeftIcon } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"

import { useCustomer, useUpdateCustomer } from "./api"
import { CustomerForm } from "./CreateCustomerPage"

export function EditCustomerPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const customer = useCustomer(id)
  const updateCustomer = useUpdateCustomer()

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/customers/${id}`}>
          <ArrowLeftIcon />
          Back to customer
        </Link>
      </Button>
      {customer.isPending ? (
        <p className="text-sm text-muted-foreground">Loading customer…</p>
      ) : customer.isError ? (
        <QueryError error={customer.error} />
      ) : (
        <CustomerForm
          title={`Edit ${customer.data.code}`}
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
