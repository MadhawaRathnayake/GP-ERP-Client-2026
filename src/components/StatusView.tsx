import { ArrowLeftIcon, FileQuestionIcon, HomeIcon, LockIcon, type LucideIcon } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { useCan } from "@/app/auth"
import { homePage } from "@/app/layout/navigation"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/http"

interface StatusViewProps {
  icon: LucideIcon
  code: string
  title: string
  description: string
}

// Full-page message with a way back: "Go back" (when there is history) and a link to the user's first screen.
function StatusView({ icon: Icon, code, title, description }: StatusViewProps) {
  const can = useCan()
  const navigate = useNavigate()
  // "default" means this is the first page opened in the tab, so there is nothing to go back to.
  const canGoBack = useLocation().key !== "default"
  const home = homePage(can)

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{code}</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {canGoBack && (
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeftIcon />
            Go back
          </Button>
        )}
        {home && (
          <Button asChild>
            <Link to={home.to}>
              <HomeIcon />
              Go to {home.label}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <StatusView
      icon={FileQuestionIcon}
      code="404"
      title="Page not found"
      description="The page or record you are looking for does not exist, or it may have been removed."
    />
  )
}

export function NoAccessPage() {
  return (
    <StatusView
      icon={LockIcon}
      code="403"
      title="You don't have access to this page"
      description="Your role does not include this screen. Ask an administrator if you need it."
    />
  )
}

// A failed detail query: Not Found for a missing record, otherwise the server's message (plus its request id on a server error).
export function QueryError({ error }: { error: Error }) {
  if (error instanceof ApiError && error.code === "NOT_FOUND") return <NotFoundPage />
  return (
    <p className="text-sm text-destructive">
      {error.message}
      {error instanceof ApiError && error.status >= 500 && error.requestId && ` (request id ${error.requestId})`}
    </p>
  )
}
