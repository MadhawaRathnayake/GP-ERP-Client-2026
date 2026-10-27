import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ReportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Generated reports will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Nothing to show yet.</CardContent>
      </Card>
    </div>
  )
}
