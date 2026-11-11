import { ArrowLeftIcon } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"

import { useQuotation, useSalesManagers, useUpdateQuotation } from "./api"
import { QuotationForm } from "./CreateQuotationPage"

export function EditQuotationPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const quotation = useQuotation(id)
  const salesManagers = useSalesManagers()
  const updateQuotation = useUpdateQuotation()

  return (
    <div className="space-y-4">
      <TopBarActions>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/quotations/${id}`}>
            <ArrowLeftIcon />
            Back to quotation
          </Link>
        </Button>
      </TopBarActions>
      {quotation.isPending || salesManagers.isPending ? (
        <p className="text-sm text-muted-foreground">Loading quotation…</p>
      ) : quotation.isError ? (
        <QueryError error={quotation.error} />
      ) : salesManagers.isError ? (
        <QueryError error={salesManagers.error} />
      ) : quotation.data.status !== "active" || quotation.data.isDeleted ? (
        // The server refuses the edit too; say why instead of showing a form that can't be saved.
        <p className="text-sm text-muted-foreground">Only an active quotation that isn't deleted can be edited.</p>
      ) : (
        <QuotationForm
          title={`Edit quotation ${quotation.data.quotationNumber}`}
          submitLabel="Save changes"
          pending={updateQuotation.isPending}
          salesManagers={salesManagers.data}
          quotation={quotation.data}
          onSubmit={(changes) =>
            updateQuotation.mutate({ id: quotation.data.id, ...changes }, { onSuccess: () => navigate(`/quotations/${id}`) })
          }
        />
      )}
    </div>
  )
}
