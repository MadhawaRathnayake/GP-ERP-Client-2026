import { createColumnHelper } from "@tanstack/react-table"
import { CheckIcon } from "lucide-react"
import { useMemo, useState, type ComponentProps } from "react"

import type { GridFeatures } from "@/components/DataGrid"
import { PickerDialog, PickerField } from "@/components/PickerDialog"
import { Button } from "@/components/ui/button"
import { CountryName } from "@/pages/Countries/CountrySelect"

import { useSuppliers } from "./api"
import type { Supplier } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Supplier>()

const columns = columnHelper.columns([
  columnHelper.accessor("code", { header: "Code" }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => <div className="max-w-64 whitespace-normal">{info.getValue()}</div>,
  }),
  columnHelper.accessor((supplier) => supplier.city ?? "", { id: "city", header: "City" }),
  columnHelper.accessor("country", { header: "Country", cell: (info) => <CountryName code={info.getValue()} /> }),
  columnHelper.accessor((supplier) => supplier.phones.join(", "), {
    id: "phones",
    header: "Phones",
    cell: (info) => <div className="max-w-48 whitespace-normal tabular-nums">{info.getValue() || "—"}</div>,
  }),
  columnHelper.accessor((supplier) => supplier.email ?? "", {
    id: "email",
    header: "Email",
    cell: (info) => info.getValue() || "—",
  }),
])

interface SupplierPickerProps extends Omit<ComponentProps<typeof PickerField>, "value" | "onChange" | "placeholder"> {
  value: string
  onChange: (id: string) => void
  // The record's saved supplier, shown even after it left the list (deleted).
  saved?: { id: string; code: string; name: string }
}

// The supplier field of a form: shows the chosen supplier and opens a searchable grid of every supplier (the cached
// useSuppliers() list) to pick another.
export function SupplierPicker({ value, onChange, saved, ...fieldProps }: SupplierPickerProps) {
  const suppliers = useSuppliers()
  const [open, setOpen] = useState(false)
  const active = useMemo(() => suppliers.data?.filter((supplier) => !supplier.isDeleted), [suppliers.data])
  const chosen = suppliers.data?.find((supplier) => supplier.id === value) ?? (saved?.id === value ? saved : undefined)

  return (
    <>
      <PickerField
        placeholder={suppliers.isPending ? "Loading suppliers…" : "Choose a supplier"}
        onClick={() => setOpen(true)}
        {...fieldProps}
      >
        {chosen && `${chosen.code} - ${chosen.name}`}
      </PickerField>
      <PickerDialog
        open={open}
        onOpenChange={setOpen}
        title="Choose a supplier"
        searchPlaceholder="Search name, code, city, phone…"
        columns={columns}
        query={{ data: active, isPending: suppliers.isPending, error: suppliers.error }}
        label="suppliers"
        getRowId={(supplier) => supplier.id}
        rowAction={(supplier) =>
          supplier.id === value ? (
            <Button type="button" size="sm" variant="ghost" disabled>
              <CheckIcon />
              Selected
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onChange(supplier.id)
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
