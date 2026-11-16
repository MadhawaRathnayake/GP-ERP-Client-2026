import {
  ClockIcon,
  FingerprintIcon,
  GlobeIcon,
  HistoryIcon,
  LandmarkIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { DetailCard, DetailSkeleton, Empty, Field, StatTile } from "@/components/DetailCard"
import { QueryError } from "@/components/StatusView"
import { StatusPill } from "@/components/StatusPill"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton, TopBarButton } from "@/components/TopBarButton"
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

import { useDeleteSupplier, useSupplier, useUpdateSupplier } from "./api"

export function SupplierPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const can = useCan()
  const format = useFormat()
  const { data: supplier, isPending, isError, error } = useSupplier(id)
  const deleteSupplier = useDeleteSupplier()
  const updateSupplier = useUpdateSupplier()

  if (isPending || isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <TopBarActions>
          <BackButton to="/suppliers" label="Suppliers" />
        </TopBarActions>
        {isPending ? <DetailSkeleton label="Loading supplier" /> : <QueryError error={error} />}
      </div>
    )
  }

  const address = [supplier.houseNumber, supplier.street, supplier.city, supplier.district, supplier.province].filter(Boolean)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <TopBarActions>
        <BackButton to="/suppliers" label="Suppliers" />
        <div className="flex items-center gap-2">
          {can("SUPPLIERS.EDIT") && (
            <TopBarButton to={`/suppliers/${supplier.id}/edit`} icon={PencilIcon} label="Edit" />
          )}
          {!supplier.isDeleted
            ? can("SUPPLIERS.DELETE") && (
                <Dialog>
                  <DialogTrigger asChild>
                    <TopBarButton tone="danger" icon={Trash2Icon} label="Delete" />
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete {supplier.code}?</DialogTitle>
                      <DialogDescription>
                        It is hidden from the suppliers list and keeps its history. You can restore it from this page.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        disabled={deleteSupplier.isPending}
                        onClick={() =>
                          deleteSupplier.mutate(supplier.id, { onSuccess: () => navigate("/suppliers", { replace: true }) })
                        }
                      >
                        {deleteSupplier.isPending ? "Deleting…" : "Delete supplier"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )
            : can("SUPPLIERS.EDIT") && (
                <TopBarButton
                  icon={RotateCcwIcon}
                  label="Restore"
                  disabled={updateSupplier.isPending}
                  onClick={() => updateSupplier.mutate({ id: supplier.id, isDeleted: false })}
                />
              )}
        </div>
      </TopBarActions>

      <Card className="gap-0 py-0 shadow-card">
        <div className="bg-linear-to-br from-primary/15 via-chart-2/8 to-chart-5/10 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 max-w-40 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-chart-1/15 px-4 text-chart-1">
              <span className="text-[0.65rem] font-medium tracking-widest uppercase opacity-80">Supplier</span>
              <span className="max-w-full truncate font-mono text-lg font-semibold">{supplier.code}</span>
            </div>
            <div className="min-w-0 space-y-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{supplier.name}</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                {supplier.isDeleted ? (
                  <StatusPill tone="bad">Deleted</StatusPill>
                ) : (
                  <StatusPill tone="good" dot>
                    Active
                  </StatusPill>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x border-t">
          <StatTile icon={GlobeIcon} tone="blue" label="Country" value={<CountryName code={supplier.country} />} />
          <StatTile icon={ClockIcon} tone="teal" label="Supplier since" value={format.date(supplier.createdAt)} />
          <StatTile
            icon={HistoryIcon}
            tone="violet"
            label="Last updated"
            value={supplier.modifiedAt ? format.date(supplier.modifiedAt) : "Never"}
          />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DetailCard title="Contact" icon={PhoneIcon} tone="blue">
            <Field label="Phones">
              {supplier.phones.length > 0 && (
                <span className="flex flex-col gap-1">
                  {supplier.phones.map((phone) => (
                    <a key={phone} href={`tel:${phone}`} className="inline-flex items-center gap-1.5 tabular-nums text-primary hover:underline">
                      <PhoneIcon className="size-3.5" />
                      {phone}
                    </a>
                  ))}
                </span>
              )}
            </Field>
            <Field label="Email">
              {supplier.email && (
                <a href={`mailto:${supplier.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <MailIcon className="size-3.5" />
                  {supplier.email}
                </a>
              )}
            </Field>
          </DetailCard>

          <DetailCard title="Address" icon={MapPinIcon} tone="teal">
            <Field label="Street address" wide>
              {address.join(", ")}
            </Field>
            <Field label="Country">
              <CountryName code={supplier.country} />
            </Field>
          </DetailCard>

          <DetailCard title="Tax and registration" icon={LandmarkIcon} tone="amber">
            <Field label="VAT number">{supplier.vatNumber}</Field>
            <Field label="TIN number">{supplier.tinNumber}</Field>
            <Field label="PV number">{supplier.pvNumber}</Field>
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Record" icon={FingerprintIcon} tone="violet" single>
            <Field label="Supplier ID">
              <span className="font-mono text-xs break-all">{supplier.id}</span>
            </Field>
            <Field label="Created">{format.dateTime(supplier.createdAt)}</Field>
            <Field label="Modified">{supplier.modifiedAt ? format.dateTime(supplier.modifiedAt) : <Empty />}</Field>
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
