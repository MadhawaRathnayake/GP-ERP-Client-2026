import { createColumnHelper } from "@tanstack/react-table"
import { ArrowLeftIcon, PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
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

import { useCategories, useDeleteCategory, useUpdateCategory } from "./api"
import { CategoryDialog } from "./CategoryDialog"
import type { Category } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Category>()

function DeleteCategoryButton({ category }: { category: Category }) {
  const deleteCategory = useDeleteCategory()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Delete ${category.name}`}>
          <Trash2Icon />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {category.name}?</DialogTitle>
          <DialogDescription>
            It is hidden from the product form and can be restored later. A category still used by active products
            cannot be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" disabled={deleteCategory.isPending} onClick={() => deleteCategory.mutate(category.id)}>
              Delete category
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CategoriesPage() {
  const can = useCan()
  const format = useFormat()
  const categories = useCategories()
  const updateCategory = useUpdateCategory()

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
        columnHelper.accessor((category) => (category.isActive ? "Active" : "Deleted"), { id: "status", header: "Status" }),
        columnHelper.accessor("createdAt", { header: "Created", cell: (info) => format.date(info.getValue()) }),
      ]),
    [format],
  )

  const showActions = can("CATEGORY.EDIT") || can("CATEGORY.DELETE")

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search categories…" />
        {can("CATEGORY.CREATE") && (
          <CategoryDialog
            trigger={
              <Button>
                <PlusIcon />
                New category
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
      <h1 className="text-2xl font-semibold">Product categories</h1>
      <DataGrid
        columns={columns}
        query={categories}
        label="categories"
        getRowId={(category) => category.id}
        rowActions={
          showActions
            ? (category) => (
                <div className="flex gap-2">
                  {can("CATEGORY.EDIT") && (
                    <CategoryDialog
                      category={category}
                      trigger={
                        <Button variant="outline" size="sm" aria-label={`Edit ${category.name}`}>
                          <PencilIcon />
                          Edit
                        </Button>
                      }
                    />
                  )}
                  {category.isActive
                    ? can("CATEGORY.DELETE") && <DeleteCategoryButton category={category} />
                    : can("CATEGORY.EDIT") && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updateCategory.isPending}
                          onClick={() => updateCategory.mutate({ id: category.id, isActive: true })}
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
