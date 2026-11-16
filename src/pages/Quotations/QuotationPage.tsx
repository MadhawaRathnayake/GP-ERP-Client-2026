import {
  BanIcon,
  CheckIcon,
  FileTextIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { useCan, type PermissionKey } from "@/app/auth"
import { DetailSkeleton } from "@/components/DetailCard"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton, PdfButtons, TopBarButton } from "@/components/TopBarButton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { useCountryName } from "@/pages/Countries/api"
import { useQuotationInvoices } from "@/pages/Invoices/api"

import { useDeleteQuotation, useQuotation, useUpdateQuotation } from "./api"
import { QuotationClassicView } from "./QuotationClassicView"
import { isCancelled, type SettableStatus } from "./types"

export function QuotationPage() {
  const countryName = useCountryName()
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const can = useCan()
  const { data: quotation, isPending, isError, error } = useQuotation(id)
  const updateQuotation = useUpdateQuotation()
  const deleteQuotation = useDeleteQuotation()
  // Its invoices (at most one that isn't cancelled), linked from the details.
  const invoices = useQuotationInvoices(Number(id), can("INVOICES.VIEW"))

  if (isPending || isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <TopBarActions>
          <BackButton to="/quotations" label="Quotations" />
        </TopBarActions>
        {isPending ? <DetailSkeleton label="Loading quotation" /> : <QueryError error={error} />}
      </div>
    )
  }

  const { status, isDeleted } = quotation
  const number = quotation.quotationNumber
  const isActive = status === "active" && !isDeleted
  const isConfirmed = status === "paymentConfirmed" || status === "creditConfirmed"
  // Each status change has its own permission, as the server checks. Once invoiced nothing can change; a deleted
  // quotation has to be restored first.
  const canChangeStatus = (permission: PermissionKey) => can(permission) && status !== "invoiceCreated" && !isDeleted
  // Reopening a quotation cancelled after a confirmation also undoes that confirmation.
  const canReopen =
    canChangeStatus("QUOTATIONS.REOPEN") && (status === "cancelled" || can("QUOTATIONS.UNDO_CONFIRMATION"))
  const setStatus = (next: SettableStatus) => (close: () => void) =>
    updateQuotation.mutate({ id: quotation.id, status: next }, { onSuccess: close })

  return (
    <div className="space-y-5">
      <TopBarActions>
        <BackButton to="/quotations" label="Quotations" />
        {/* Opens the invoice form filled from this quotation; saving it makes a draft invoice and locks the quotation. */}
        {isConfirmed && !isDeleted && can("INVOICES.CREATE") && (
          <TopBarButton tone="main" to={`/invoices/create?quotationId=${quotation.id}`} icon={FileTextIcon} label="Create invoice" />
        )}
        {canChangeStatus("QUOTATIONS.CONFIRM_PAYMENT") && status === "active" && (
          <ConfirmButton
            icon={CheckIcon}
            label="Confirm payment"
            primary
            title={`Confirm payment for ${number}?`}
            description="Records that the customer has paid this quotation. It can't be edited after this."
            pending={updateQuotation.isPending}
            onConfirm={setStatus("paymentConfirmed")}
          />
        )}
        {canChangeStatus("QUOTATIONS.CONFIRM_CREDIT") && status === "active" && (
          <ConfirmButton
            icon={CheckIcon}
            label="Confirm credit"
            primary
            title={`Confirm credit for ${number}?`}
            description="Allows this quotation to go ahead on credit. It can't be edited after this."
            pending={updateQuotation.isPending}
            onConfirm={setStatus("creditConfirmed")}
          />
        )}
        {canChangeStatus("QUOTATIONS.UNDO_CONFIRMATION") && isConfirmed && (
          <ConfirmButton
            icon={Undo2Icon}
            label="Undo confirmation"
            title={`Undo the ${status === "paymentConfirmed" ? "payment" : "credit"} confirmation?`}
            description={`${number} goes back to Active and can be edited again.`}
            pending={updateQuotation.isPending}
            onConfirm={setStatus("active")}
          />
        )}
        {canReopen && isCancelled(status) && (
          <ConfirmButton
            icon={RotateCcwIcon}
            label="Reopen"
            title={`Reopen ${number}?`}
            description="It goes back to Active and can be edited again."
            pending={updateQuotation.isPending}
            onConfirm={setStatus("active")}
          />
        )}
        {canChangeStatus("QUOTATIONS.CANCEL") && (status === "active" || isConfirmed) && (
          <ConfirmButton
            icon={BanIcon}
            label="Cancel quotation"
            title={`Cancel ${number}?`}
            description="It stays in the list as Cancelled. You can reopen it later."
            destructive
            pending={updateQuotation.isPending}
            onConfirm={setStatus("cancelled")}
          />
        )}
        {isActive && can("QUOTATIONS.DELETE") && (
          <ConfirmButton
            icon={Trash2Icon}
            label="Delete"
            title={`Delete ${number}?`}
            description="It is hidden from the quotations list and keeps its lines. You can restore it from this page."
            destructive
            pending={deleteQuotation.isPending}
            onConfirm={() =>
              deleteQuotation.mutate(quotation.id, { onSuccess: () => navigate("/quotations", { replace: true }) })
            }
          />
        )}
        {isDeleted && can("QUOTATIONS.RESTORE") && (
          <TopBarButton
            icon={RotateCcwIcon}
            label="Restore"
            disabled={updateQuotation.isPending}
            onClick={() => updateQuotation.mutate({ id: quotation.id, isDeleted: false })}
          />
        )}
        {isActive && can("QUOTATIONS.EDIT") && (
          <TopBarButton to={`/quotations/${quotation.id}/edit`} icon={PencilIcon} label="Edit" />
        )}
        {/* As in the old system, a cancelled quotation has no document to send. */}
        {!isCancelled(status) && (
          <PdfButtons
            fileName={`${number} ${quotation.customer.name}.pdf`}
            document={() =>
              import("./QuotationDocument").then((module) =>
                <module.QuotationDocument quotation={quotation} countryName={countryName(quotation.customer.country)} />,
              )
            }
          />
        )}
      </TopBarActions>
      <QuotationClassicView quotation={quotation} invoices={invoices.data ?? []} />
    </div>
  )
}

interface ConfirmButtonProps {
  icon: LucideIcon
  label: string
  title: string
  description: string
  // Red button and confirm, for cancelling and deleting.
  destructive?: boolean
  // Filled: the page's main next step (approve, confirm, finalize).
  primary?: boolean
  pending: boolean
  // Called with a function that closes the dialog, for the mutation's onSuccess.
  onConfirm: (close: () => void) => void
}

// Also used on the invoice page.
export function ConfirmButton({ icon, label, title, description, destructive, primary, pending, onConfirm }: ConfirmButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TopBarButton icon={icon} label={label} tone={primary ? "main" : destructive ? "danger" : "soft"} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Back</Button>
          </DialogClose>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() => onConfirm(() => setOpen(false))}
          >
            {pending ? "Saving…" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
