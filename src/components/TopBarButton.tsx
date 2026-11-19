import type { DocumentProps } from "@react-pdf/renderer"
import { useState, type ComponentProps, type ReactElement } from "react"
import { ArrowLeftIcon, DownloadIcon, EyeIcon, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const variants = { main: "positive", soft: "soft", danger: "destructive" } as const

interface TopBarButtonProps extends Omit<ComponentProps<typeof Button>, "variant" | "children" | "asChild"> {
  icon: LucideIcon
  label: string
  // main: the page's one next step (green tint) · soft: every other action · danger: delete, cancel, reject.
  tone?: keyof typeof variants
  // Makes it a link.
  to?: string
}

// Every button in the top bar. On phones only the icon shows; the label stays as its accessible name.
// Spreads the rest of its props onto the button, so it works as a dialog's trigger (`<DialogTrigger asChild>`).
export function TopBarButton({ icon: Icon, label, tone = "soft", to, ...props }: TopBarButtonProps) {
  const content = (
    <>
      <Icon />
      <span className="hidden sm:inline">{label}</span>
    </>
  )
  return to ? (
    <Button variant={variants[tone]} aria-label={label} asChild {...props}>
      <Link to={to}>{content}</Link>
    </Button>
  ) : (
    <Button variant={variants[tone]} aria-label={label} {...props}>
      {content}
    </Button>
  )
}

// The first thing in the top bar on every page below a list: `label` is where it goes ("Quotations", "QT-0012").
export function BackButton({ to, label }: { to: string; label: string }) {
  return (
    <Button variant="ghost" aria-label={`Back to ${label}`} asChild>
      <Link to={to}>
        <ArrowLeftIcon />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    </Button>
  )
}

// "Preview PDF" and "Download PDF" for a document page (quotation, invoice, IR, PO, GRN). `document` imports the page's
// PDF file and returns its <Document>; it and the PDF library load only when a button is clicked, so the large library
// never loads just to open a page. The preview uses the browser's own PDF viewer.
// `name` labels the pair when a page has more than one document ("Preview customer copy").
export function PdfButtons({
  fileName,
  document: load,
  name = "PDF",
}: {
  fileName: string
  document: () => Promise<ReactElement<DocumentProps>>
  name?: string
}) {
  const [busy, setBusy] = useState<"preview" | "download" | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const run = async (action: "preview" | "download") => {
    setBusy(action)
    try {
      const [{ pdf }, element] = await Promise.all([import("@react-pdf/renderer"), load()])
      const url = URL.createObjectURL(await pdf(element).toBlob())
      if (action === "preview") {
        setPreviewUrl(url)
      } else {
        const link = document.createElement("a")
        link.href = url
        link.download = fileName
        link.click()
        // Give the browser a moment to start the download before the file is let go.
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
    } catch (error) {
      toast.error(`Could not make the PDF: ${error instanceof Error ? error.message : "unknown error"}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <TopBarButton
        icon={EyeIcon}
        label={busy === "preview" ? "Preparing…" : `Preview ${name}`}
        disabled={busy !== null}
        onClick={() => void run("preview")}
      />
      <TopBarButton
        icon={DownloadIcon}
        label={busy === "download" ? "Preparing…" : `Download ${name}`}
        disabled={busy !== null}
        onClick={() => void run("download")}
      />
      <Dialog
        open={previewUrl !== null}
        onOpenChange={(open) => {
          if (open || !previewUrl) return
          URL.revokeObjectURL(previewUrl)
          setPreviewUrl(null)
        }}
      >
        <DialogContent className="flex h-[90vh] flex-col sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{fileName}</DialogTitle>
            <DialogDescription>As it prints and downloads.</DialogDescription>
          </DialogHeader>
          {previewUrl && <iframe src={previewUrl} title={fileName} className="min-h-0 w-full flex-1 rounded-md border" />}
        </DialogContent>
      </Dialog>
    </>
  )
}
