import { liveList } from "@/app/liveList"
import { fetchInternalRequisitionsByIds, fetchRecentInternalRequisitions } from "./api"
import type { InternalRequisitionSummary } from "./types"

// The internal-requisitions list, kept live by `internalRequisition` events (app/liveList.ts).
export const liveInternalRequisitions = liveList<InternalRequisitionSummary>({
  key: "internal-requisitions",
  event: "internalRequisition",
  fetchByIds: fetchInternalRequisitionsByIds,
  fetchRecent: fetchRecentInternalRequisitions,
})
