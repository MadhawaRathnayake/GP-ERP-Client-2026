import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  FingerprintIcon,
  LandmarkIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  ReceiptIcon,
  RotateCcwIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { DetailCard, DetailSkeleton, Empty, Field, StatTile } from "@/components/DetailCard"
import { QueryError } from "@/components/StatusView"
import { StatusPill } from "@/components/StatusPill"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
      <div className="mx-auto max-w-6xl">
        <TopBarActions>
          <BackLink />
        </TopBarActions>
        {isPending ? <DetailSkeleton label="Loading customer" /> : <QueryError error={error} />}
      </div>
    )
  }

  // Set by the system from invoices.
  const activity = customer.isDormant
    ? { label: "Dormant", tone: "warn" as const }
    : customer.isActive
      ? { label: "Active", tone: "good" as const }
      : { label: "Inactive", tone: "neutral" as const }
  const address = [customer.houseNumber, customer.street, customer.city, customer.district, customer.province].filter(Boolean)
  const name = customer.type === "B2C" && customer.title ? `${customer.title} ${customer.name}` : customer.name
  const phoneLinks = (phones: string[]) =>
    phones.length > 0 && (
      <span className="flex flex-col gap-1">
        {phones.map((phone) => (
          <a key={phone} href={`tel:${phone}`} className="inline-flex items-center gap-1.5 tabular-nums text-primary hover:underline">
            <PhoneIcon className="size-3.5" />
            {phone}
          </a>
        ))}
      </span>
    )

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <TopBarActions>
        <BackLink />
        <div className="ml-auto flex items-center gap-2">
          {!customer.isDeleted
            ? can("CUSTOMERS.DELETE") && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2Icon />
                      <span className="hidden sm:inline">Delete</span>
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
                  <span className="hidden sm:inline">Restore</span>
                </Button>
              )}
          {can("CUSTOMERS.EDIT") && (
            <Button asChild>
              <Link to={`/customers/${customer.id}/edit`}>
                <PencilIcon />
                <span className="hidden sm:inline">Edit</span>
              </Link>
            </Button>
          )}
        </div>
      </TopBarActions>

      {/* Profile: a tinted band with who the customer is, then the numbers a salesperson checks first. */}
      <Card className="gap-0 py-0 shadow-card">
        <div className="bg-linear-to-br from-primary/15 via-chart-2/8 to-chart-5/10 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {/* The customer code as a badge: what staff quote on the phone and on documents. */}
            <div className="flex h-16 max-w-40 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-chart-1/15 px-4 text-chart-1">
              <span className="text-[0.65rem] font-medium tracking-widest uppercase opacity-80">Customer</span>
              <span className="max-w-full truncate font-mono text-lg font-semibold">{customer.code}</span>
            </div>
            <div className="min-w-0 space-y-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill>{typeLabels[customer.type]}</StatusPill>
                <StatusPill tone={activity.tone} dot>
                  {activity.label}
                </StatusPill>
                {customer.isCommissioned && <StatusPill tone="info">Commissioned</StatusPill>}
                {customer.isDeleted && <StatusPill tone="bad">Deleted</StatusPill>}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x border-t">
          <StatTile icon={ReceiptIcon} tone="blue" label="Invoices" value={customer.totalInvoices} />
          <StatTile
            icon={CalendarIcon}
            tone="teal"
            label="Last invoice"
            value={customer.lastInvoiceDate ? format.date(customer.lastInvoiceDate) : "None yet"}
          />
          <StatTile icon={ClockIcon} tone="violet" label="Customer since" value={format.date(customer.createdAt)} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DetailCard title="Contact" icon={PhoneIcon} tone="blue">
            <Field label="Phones">{phoneLinks(customer.phones)}</Field>
            <Field label="Email">
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <MailIcon className="size-3.5" />
                  {customer.email}
                </a>
              )}
            </Field>
            <Field label="Contact person">{customer.contactPerson}</Field>
            <Field label="Contact phones">{phoneLinks(customer.contactPhones)}</Field>
          </DetailCard>

          <DetailCard title="Address" icon={MapPinIcon} tone="teal">
            <Field label="Street address" wide>
              {address.join(", ")}
            </Field>
            <Field label="Country">
              <CountryName code={customer.country} />
            </Field>
          </DetailCard>

          <DetailCard title="Tax and registration" icon={LandmarkIcon} tone="amber">
            <Field label="VAT number">{customer.vatNumber}</Field>
            <Field label="TIN number">{customer.tinNumber}</Field>
            <Field label="PV number">{customer.pvNumber}</Field>
            <Field label="Commissioned">{customer.isCommissioned ? "Yes" : "No"}</Field>
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Notes" icon={StickyNoteIcon} tone="rose" single>
            {customer.notes ? (
              <p className="whitespace-pre-line">{customer.notes}</p>
            ) : (
              <p className="text-muted-foreground">No notes.</p>
            )}
          </DetailCard>
          <DetailCard title="Record" icon={FingerprintIcon} tone="violet" single>
            <Field label="Customer ID">
              <span className="font-mono text-xs break-all">{customer.id}</span>
            </Field>
            <Field label="Created">{format.dateTime(customer.createdAt)}</Field>
            <Field label="Modified">{customer.modifiedAt ? format.dateTime(customer.modifiedAt) : <Empty />}</Field>
          </DetailCard>
        </div>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Button variant="ghost" asChild>
      <Link to="/customers" aria-label="Back to customers">
        <ArrowLeftIcon />
        <span className="hidden sm:inline">Customers</span>
      </Link>
    </Button>
  )
}
