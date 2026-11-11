import { ArrowLeftIcon } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"

import { useInternalRequisition, useUpdateInternalRequisition } from "./api"
import { InternalRequisitionForm } from "./CreateInternalRequisitionPage"
import { isEditable } from "./types"

export function EditInternalRequisitionPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const requisition = useInternalRequisition(id)
  const updateRequisition = useUpdateInternalRequisition()

  return (
    <div className="space-y-4">
      <TopBarActions>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/internal-requisitions/${id}`}>
            <ArrowLeftIcon />
            Back to internal requisition
          </Link>
        </Button>
      </TopBarActions>
      {requisition.isPending ? (
        <p className="text-sm text-muted-foreground">Loading internal requisition…</p>
      ) : requisition.isError ? (
        <QueryError error={requisition.error} />
      ) : !isEditable(requisition.data.status) ? (
        // The server refuses the edit too; say why instead of showing a form that can't be saved.
        <p className="text-sm text-muted-foreground">Only a pending or rejected internal requisition can be edited.</p>
      ) : (
        <InternalRequisitionForm
          title={`Edit internal requisition ${requisition.data.internalRequisitionNumber}`}
          // Saving a rejected IR sends it for approval again.
          submitLabel={requisition.data.status === "rejected" ? "Save & resubmit" : "Save changes"}
          pending={updateRequisition.isPending}
          requisition={requisition.data}
          onSubmit={(fields) =>
            updateRequisition.mutate(
              { id: requisition.data.id, ...fields },
              { onSuccess: () => navigate(`/internal-requisitions/${id}`) },
            )
          }
        />
      )}
    </div>
  )
}
