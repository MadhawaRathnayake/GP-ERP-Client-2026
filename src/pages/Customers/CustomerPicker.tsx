import { createColumnHelper } from "@tanstack/react-table"
import { CheckIcon } from "lucide-react"
import { useMemo, useState, type ComponentProps } from "react"

import type { GridFeatures } from "@/components/DataGrid"
import { PickerDialog, PickerField } from "@/components/PickerDialog"
import { StatusPill } from "@/components/StatusPill"
import { Button } from "@/components/ui/button"

import { useCustomers } from "./api"
import type { Customer } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Customer>()

const columns = columnHelper.columns([
  columnHelper.accessor("code", { header: "Code" }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => (
      <div className="max-w-64 whitespace-normal">
        {info.getValue()}
        {info.row.original.isCommissioned && (
          <span className="ml-2">
            <StatusPill tone="bad">Commissioned</StatusPill>
          </span>
        )}
      </div>
    ),
  }),
  columnHelper.accessor((customer) => (customer.type === "B2B" ? "Business" : "Person"), { id: "type", header: "Type" }),
  columnHelper.accessor((customer) => customer.city ?? "", { id: "city", header: "City" }),
  columnHelper.accessor((customer) => customer.district ?? "", { id: "district", header: "District" }),
  columnHelper.accessor((customer) => customer.phones.join(", "), {
    id: "phones",
    header: "Phones",
    cell: (info) => <div className="max-w-48 whitespace-normal tabular-nums">{info.getValue() || "—"}</div>,
  }),
  columnHelper.accessor("totalInvoices", { header: "Invoices" }),
  columnHelper.accessor((customer) => (customer.isDormant ? "Dormant" : customer.isActive ? "Active" : "Inactive"), {
    id: "activity",
    header: "Activity",
    cell: (info) => (
      <StatusPill tone={info.getValue() === "Active" ? "good" : info.getValue() === "Dormant" ? "warn" : "neutral"} dot>
        {info.getValue()}
      </StatusPill>
    ),
  }),
])

interface CustomerPickerProps extends Omit<ComponentProps<typeof PickerField>, "value" | "onChange" | "placeholder"> {
  value: string
  onChange: (id: string) => void
  // The record's saved customer, shown even after it left the list (deleted).
  saved?: { id: string; code: string; name: string }
}

// The customer field of a form: shows the chosen customer and opens a searchable grid of every customer (the cached
// useCustomers() list) to pick another.
export function CustomerPicker({ value, onChange, saved, ...fieldProps }: CustomerPickerProps) {
  const customers = useCustomers()
  const [open, setOpen] = useState(false)
  const active = useMemo(() => customers.data?.filter((customer) => !customer.isDeleted), [customers.data])
  const chosen = customers.data?.find((customer) => customer.id === value) ?? (saved?.id === value ? saved : undefined)

  return (
    <>
      <PickerField
        placeholder={customers.isPending ? "Loading customers…" : "Choose a customer"}
        onClick={() => setOpen(true)}
        {...fieldProps}
      >
        {chosen && `${chosen.code} - ${chosen.name}`}
      </PickerField>
      <PickerDialog
        open={open}
        onOpenChange={setOpen}
        title="Choose a customer"
        searchPlaceholder="Search name, code, city, phone…"
        columns={columns}
        query={{ data: active, isPending: customers.isPending, error: customers.error }}
        label="customers"
        getRowId={(customer) => customer.id}
        rowAction={(customer) =>
          customer.id === value ? (
            <Button type="button" size="sm" variant="ghost" disabled>
              <CheckIcon />
              Selected
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onChange(customer.id)
                setOpen(false)
              }}
            >
              Select
            </Button>
          )
        }
      />
    </>
  )
}
