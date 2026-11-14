import { createColumnHelper } from "@tanstack/react-table"
import { ArrowLeftIcon, PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
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

import { AccessoryDialog } from "./AccessoryDialog"
import { useAccessories, useDeleteAccessory, useUpdateAccessory } from "./api"
import type { Accessory } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Accessory>()

function DeleteAccessoryButton({ accessory }: { accessory: Accessory }) {
  const deleteAccessory = useDeleteAccessory()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Delete ${accessory.name}`}>
          <Trash2Icon />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {accessory.name}?</DialogTitle>
          <DialogDescription>
            It can no longer be added to products, and can be restored later. Serials already recorded keep it. An
            accessory that still comes with a product cannot be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" disabled={deleteAccessory.isPending} onClick={() => deleteAccessory.mutate(accessory.id)}>
              Delete accessory
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AccessoriesPage() {
  const can = useCan()
  const accessories = useAccessories()
  const updateAccessory = useUpdateAccessory()

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        }),
        columnHelper.accessor("description", {
          header: "Description",
          cell: (info) => <span className="whitespace-normal text-muted-foreground">{info.getValue() || "—"}</span>,
        }),
        columnHelper.accessor((accessory) => accessory.product?.sku ?? "—", { id: "product", header: "Sold on its own as" }),
        columnHelper.accessor((accessory) => (accessory.isDeleted ? "Deleted" : "Active"), { id: "status", header: "Status" }),
      ]),
    [],
  )

  const showActions = can("ACCESSORIES.EDIT") || can("ACCESSORIES.DELETE")

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search accessories…" />
        {can("ACCESSORIES.CREATE") && (
          <AccessoryDialog
            trigger={
              <Button>
                <PlusIcon />
                New accessory
              </Button>
            }
          />
        )}
      </TopBarActions>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/products">
          <ArrowLeftIcon />
          Back to products
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">Accessories</h1>
      <p className="text-sm text-muted-foreground">
        What can come in a product&apos;s box with its own serial number. Say what comes with a product on its page.
      </p>
      <DataGrid
        columns={columns}
        query={accessories}
        label="accessories"
        getRowId={(accessory) => accessory.id}
        rowActions={
          showActions
            ? (accessory) => (
                <div className="flex gap-2">
                  {can("ACCESSORIES.EDIT") && (
                    <AccessoryDialog
                      accessory={accessory}
                      trigger={
                        <Button variant="outline" size="sm" aria-label={`Edit ${accessory.name}`}>
                          <PencilIcon />
                          Edit
                        </Button>
                      }
                    />
                  )}
                  {!accessory.isDeleted
                    ? can("ACCESSORIES.DELETE") && <DeleteAccessoryButton accessory={accessory} />
                    : can("ACCESSORIES.EDIT") && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updateAccessory.isPending}
                          onClick={() => updateAccessory.mutate({ id: accessory.id, isDeleted: false })}
                        >
                          <RotateCcwIcon />
                          Restore
                        </Button>
                      )}
                </div>
              )
            : undefined
        }
      />
    </div>
  )
}
