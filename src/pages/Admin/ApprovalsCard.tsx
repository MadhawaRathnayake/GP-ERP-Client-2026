import { useId } from "react"
import { useForm } from "react-hook-form"

import { useCan } from "@/app/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormField, FormItem } from "@/components/ui/form"
import { Label } from "@/components/ui/label"

import { useApprovalRules, useSaveApprovalRules } from "./api"
import type { ApprovalRule } from "./types"

// Screen code → whether its documents need approval.
type ApprovalValues = Record<string, boolean>

const toValues = (rules: ApprovalRule[]): ApprovalValues => Object.fromEntries(rules.map((rule) => [rule.screen, rule.isRequired]))

// Shown on the admin screen with APPROVALS.VIEW; saving needs APPROVALS.EDIT.
export function ApprovalsCard() {
  const rules = useApprovalRules()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approvals</CardTitle>
        <CardDescription>
          Which screens&apos; documents need approval before they can go on. Users whose role has the screen&apos;s
          Approve and Reject permissions decide, including on documents they made themselves. When a screen doesn&apos;t
          need approval, its documents are approved on save.
        </CardDescription>
      </CardHeader>
      {rules.isError ? (
        <CardContent>
          <p className="text-sm text-destructive">Could not load the approval settings: {rules.error.message}</p>
        </CardContent>
      ) : rules.isPending ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading approval settings…</p>
        </CardContent>
      ) : (
        <ApprovalsForm rules={rules.data} />
      )}
    </Card>
  )
}

// Mounts once the rules have loaded, so the form starts with the saved values.
function ApprovalsForm({ rules }: { rules: ApprovalRule[] }) {
  const can = useCan()
  const canEdit = can("APPROVALS.EDIT")
  const saveRules = useSaveApprovalRules()
  const idPrefix = useId()
  const form = useForm<ApprovalValues>({ defaultValues: toValues(rules) })

  const onSubmit = (values: ApprovalValues) => {
    const changes = rules
      .filter((rule) => values[rule.screen] !== rule.isRequired)
      .map((rule) => ({ screen: rule.screen, isRequired: values[rule.screen] === true }))
    saveRules.mutate(changes, { onSuccess: () => form.reset(values) })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <fieldset disabled={!canEdit} className="space-y-3">
            {rules.map((rule) => {
              const id = `${idPrefix}-${rule.screen}`
              return (
                <FormField
                  key={rule.screen}
                  control={form.control}
                  name={rule.screen}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        checked={field.value}
                        disabled={!canEdit}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                      <Label htmlFor={id} className="font-normal">
                        {rule.label} need approval
                      </Label>
                    </FormItem>
                  )}
                />
              )
            })}
          </fieldset>
          {!canEdit && (
            <p className="mt-4 text-sm text-muted-foreground">Only roles the Super Admin has given Approvals → Edit can change these.</p>
          )}
        </CardContent>
        {canEdit && (
          <CardFooter className="mt-4 justify-end">
            <Button type="submit" disabled={!form.formState.isDirty || saveRules.isPending}>
              {saveRules.isPending ? "Saving…" : "Save approvals"}
            </Button>
          </CardFooter>
        )}
      </form>
    </Form>
  )
}
