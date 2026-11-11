import { ArrowLeftIcon } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"

import { useGoodsReceivedNote, useOrderReceipt, useUpdateGoodsReceivedNote } from "./api"
import { GoodsReceivedNoteForm } from "./CreateGoodsReceivedNotePage"
import { isOpen, type GoodsReceivedNote } from "./types"

export function EditGoodsReceivedNotePage() {
  const { id = "" } = useParams()
  const note = useGoodsReceivedNote(id)

  return (
    <div className="space-y-4">
      <TopBarActions>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/goods-received-notes/${id}`}>
            <ArrowLeftIcon />
            Back to GRN
          </Link>
        </Button>
      </TopBarActions>
      {note.isPending ? (
        <p className="text-sm text-muted-foreground">Loading GRN…</p>
      ) : note.isError ? (
        <QueryError error={note.error} />
      ) : !isOpen(note.data.status) ? (
        // The server refuses the edit too; say why instead of showing a form that can't be saved.
        <p className="text-sm text-muted-foreground">Only a pending or rejected GRN can be edited.</p>
      ) : (
        <EditForm goodsReceivedNote={note.data} />
      )}
    </div>
  )
}

function EditForm({ goodsReceivedNote }: { goodsReceivedNote: GoodsReceivedNote }) {
  const navigate = useNavigate()
  const updateNote = useUpdateGoodsReceivedNote()
  // What is outstanding now: this GRN isn't approved, so it isn't counted.
  const receipt = useOrderReceipt(String(goodsReceivedNote.internalRequisitionId))

  if (receipt.isPending) return <p className="text-sm text-muted-foreground">Loading the order…</p>
  if (receipt.isError) return <QueryError error={receipt.error} />
  return (
    <GoodsReceivedNoteForm
      title={`Edit GRN ${goodsReceivedNote.grnNumber}`}
      // Saving a rejected GRN sends it for approval again.
      submitLabel={goodsReceivedNote.status === "rejected" ? "Save & resubmit" : "Save changes"}
      pending={updateNote.isPending}
      receipt={receipt.data}
      goodsReceivedNote={goodsReceivedNote}
      onSubmit={(fields) =>
        updateNote.mutate({ id: goodsReceivedNote.id, ...fields }, { onSuccess: () => navigate(`/goods-received-notes/${goodsReceivedNote.id}`) })
      }
    />
  )
}
