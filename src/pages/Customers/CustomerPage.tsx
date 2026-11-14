import { ArrowLeftIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import type { ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
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
import { CountryName } from "@/pages/Countries/CountrySelect"

import { useCustomer, useDeleteCustomer, useUpdateCustomer } from "./api"

const typeLabels = { B2B: "Business (B2B)", B2C: "Person (B2C)" }

export function CustomerPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const can = useCan()
  const format = useFormat()
  const { data: customer, isPending, isError, error } = useCustomer(id)
  const deleteCustomer = useDeleteCustomer()
  const updateCustomer = useUpdateCustomer()

  if (isPending || isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        {isPending ? <p className="text-sm text-muted-foreground">Loading customer…</p> : <QueryError error={error} />}
      </div>
    )
  }

  const details: [string, ReactNode][] = [
    ["Code", customer.code],
    ["Type", typeLabels[customer.type]],
    ...(customer.type === "B2C" ? [["Title", customer.title ?? "—"] satisfies [string, ReactNode]] : []),
    ["Name", customer.name],
    ["Phones", customer.phones.length ? customer.phones.join(", ") : "—"],
    ["Email", customer.email ?? "—"],
    ["Contact person", customer.contactPerson ?? "—"],
    ["Contact phones", customer.contactPhones.length ? customer.contactPhones.join(", ") : "—"],
    ["House number", customer.houseNumber ?? "—"],
    ["Street", customer.street ?? "—"],
    ["City", customer.city ?? "—"],
    ["District", customer.district ?? "—"],
    ["Province", customer.province ?? "—"],
    ["Country", <CountryName code={customer.country} />],
    ["VAT number", customer.vatNumber ?? "—"],
    ["TIN number", customer.tinNumber ?? "—"],
    ["PV number", customer.pvNumber ?? "—"],
    ["Commissioned", customer.isCommissioned ? "Yes" : "No"],
    ["Notes", <span className="whitespace-pre-line">{customer.notes ?? "—"}</span>],
    // Set by the system from invoices.
    ["Activity", customer.isDormant ? "Dormant" : customer.isActive ? "Active" : "Inactive"],
    ["Last invoice", customer.lastInvoiceDate ? format.date(customer.lastInvoiceDate) : "—"],
    ["Total invoices", customer.totalInvoices],
    ["Status", customer.isDeleted ? <span className="text-destructive">Deleted</span> : "Not deleted"],
    ["Customer ID", customer.id],
    ["Created", format.dateTime(customer.createdAt)],
    ["Modified", customer.modifiedAt ? format.dateTime(customer.modifiedAt) : "—"],
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold uppercase">Customer {customer.code}</h1>
      <BackLink />
      <div className="max-w-3xl space-y-4">
        <dl className="border-t">
          {details.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-4 border-b px-2 py-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
        {(can("CUSTOMERS.EDIT") || can("CUSTOMERS.DELETE")) && (
          <div className="flex flex-wrap gap-2">
            {!customer.isDeleted
              ? can("CUSTOMERS.DELETE") && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2Icon />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete {customer.code}?</DialogTitle>
                        <DialogDescription>
                          It is hidden from the customers list and keeps its history. You can restore it from this page.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                          variant="destructive"
                          disabled={deleteCustomer.isPending}
                          onClick={() =>
                            deleteCustomer.mutate(customer.id, { onSuccess: () => navigate("/customers", { replace: true }) })
                          }
                        >
                          {deleteCustomer.isPending ? "Deleting…" : "Delete customer"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )
              : can("CUSTOMERS.EDIT") && (
                  <Button
                    variant="outline"
                    disabled={updateCustomer.isPending}
                    onClick={() => updateCustomer.mutate({ id: customer.id, isDeleted: false })}
                  >
                    <RotateCcwIcon />
                    Restore
                  </Button>
                )}
            {can("CUSTOMERS.EDIT") && (
              <Button asChild>
                <Link to={`/customers/${customer.id}/edit`}>
                  <PencilIcon />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/customers">
        <ArrowLeftIcon />
        Back to customers
      </Link>
    </Button>
  )
}
