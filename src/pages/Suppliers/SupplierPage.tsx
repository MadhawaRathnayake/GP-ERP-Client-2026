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
      <div className="space-y-4">
        <BackLink />
        {isPending ? <p className="text-sm text-muted-foreground">Loading supplier…</p> : <QueryError error={error} />}
      </div>
    )
  }

  const details: [string, ReactNode][] = [
    ["Code", supplier.code],
    ["Name", supplier.name],
    ["Phones", supplier.phones.length ? supplier.phones.join(", ") : "—"],
    ["Email", supplier.email ?? "—"],
    ["House number", supplier.houseNumber ?? "—"],
    ["Street", supplier.street ?? "—"],
    ["City", supplier.city ?? "—"],
    ["District", supplier.district ?? "—"],
    ["Province", supplier.province ?? "—"],
    ["Country", <CountryName code={supplier.country} />],
    ["VAT number", supplier.vatNumber ?? "—"],
    ["TIN number", supplier.tinNumber ?? "—"],
    ["PV number", supplier.pvNumber ?? "—"],
    ["Status", supplier.isDeleted ? <span className="text-destructive">Deleted</span> : "Active"],
    ["Supplier ID", supplier.id],
    ["Created", format.dateTime(supplier.createdAt)],
    ["Modified", supplier.modifiedAt ? format.dateTime(supplier.modifiedAt) : "—"],
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold uppercase">Supplier {supplier.code}</h1>
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
        {(can("SUPPLIERS.EDIT") || can("SUPPLIERS.DELETE")) && (
          <div className="flex flex-wrap gap-2">
            {!supplier.isDeleted
              ? can("SUPPLIERS.DELETE") && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2Icon />
                        Delete
                      </Button>
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
                  <Button
                    variant="outline"
                    disabled={updateSupplier.isPending}
                    onClick={() => updateSupplier.mutate({ id: supplier.id, isDeleted: false })}
                  >
                    <RotateCcwIcon />
                    Restore
                  </Button>
                )}
            {can("SUPPLIERS.EDIT") && (
              <Button asChild>
                <Link to={`/suppliers/${supplier.id}/edit`}>
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
      <Link to="/suppliers">
        <ArrowLeftIcon />
        Back to suppliers
      </Link>
    </Button>
  )
}
