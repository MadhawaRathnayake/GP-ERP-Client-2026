import { ArrowLeftIcon } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"

import { useInvoice, useUpdateInvoice } from "./api"
import { InvoiceForm } from "./CreateInvoicePage"

export function EditInvoicePage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const invoice = useInvoice(id)
  const updateInvoice = useUpdateInvoice()

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/invoices/${id}`}>
          <ArrowLeftIcon />
          Back to invoice
        </Link>
      </Button>
      {invoice.isPending ? (
        <p className="text-sm text-muted-foreground">Loading invoice…</p>
      ) : invoice.isError ? (
        <QueryError error={invoice.error} />
      ) : invoice.data.status !== "draft" ? (
        // The server refuses the edit too; say why instead of showing a form that can't be saved.
        <p className="text-sm text-muted-foreground">Only a draft invoice can be edited.</p>
      ) : (
        <InvoiceForm
          title={`Edit draft invoice ${invoice.data.draftNumber}`}
          submitLabel="Save changes"
          pending={updateInvoice.isPending}
          source={{ kind: "invoice", invoice: invoice.data }}
          onSubmit={(fields) =>
            updateInvoice.mutate({ id: invoice.data.id, ...fields }, { onSuccess: () => navigate(`/invoices/${id}`) })
          }
        />
      )}
    </div>
  )
}
