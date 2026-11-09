import { useId } from "react"

import { useCan } from "@/app/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import { useApprovalRules, useUpdateApprovalRule } from "./api"
import type { ApprovalRule } from "./types"

// Shown on the admin screen with APPROVALS.VIEW; changing a setting needs APPROVALS.EDIT. Saved as soon as it's ticked.
export function ApprovalsCard() {
  const rules = useApprovalRules()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approvals</CardTitle>
        <CardDescription>
          Which screens&apos; documents need approval before they can go on. Anyone whose role has the screen&apos;s
          Approve and Reject permissions can decide, including the user who made the document. When a screen doesn&apos;t
          need approval, its documents are approved on save.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.isError ? (
          <p className="text-sm text-destructive">Could not load the approval settings: {rules.error.message}</p>
        ) : rules.isPending ? (
          <p className="text-sm text-muted-foreground">Loading approval settings…</p>
        ) : (
          rules.data.map((rule) => <RuleRow key={rule.screen} rule={rule} />)
        )}
      </CardContent>
    </Card>
  )
}

function RuleRow({ rule }: { rule: ApprovalRule }) {
  const can = useCan()
  const updateRule = useUpdateApprovalRule()
  const id = useId()

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={rule.isRequired}
        disabled={!can("APPROVALS.EDIT") || updateRule.isPending}
        onCheckedChange={(checked) => updateRule.mutate({ screen: rule.screen, isRequired: checked === true })}
      />
      <Label htmlFor={id} className="font-normal">
        {rule.label} need approval
      </Label>
    </div>
  )
}
