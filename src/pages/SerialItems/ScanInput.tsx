import { ScanLineIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { cleanScan } from "./scan"

// The warehouse scans with a Zebra TC21: its scanner (DataWedge) types what it reads into the focused field, like a
// keyboard. Set its profile to send ENTER after each scan. A scan ends on Enter, Tab or ";" (the old system's scanners
// added ";"), or, when a fast burst of keystrokes stops without one, after a short pause. There is no length rule, so
// short serials work. Pasting several lines scans each line. Typing by hand works too (Enter or Add).

const BURST_GAP_MS = 50 // keystrokes closer than this come from the scanner
const BURST_MIN = 4 // this many fast keystrokes in a row make a scan
const IDLE_MS = 300 // a burst that stops for this long without Enter is a finished scan

interface ScanInputProps {
  onScan: (code: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ScanInput({ onScan, placeholder = "Scan or type a serial number", disabled, className }: ScanInputProps) {
  const [value, setValue] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const lastKey = useRef(0)
  const burst = useRef(0)
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(idle.current), [])

  const commit = (text: string) => {
    clearTimeout(idle.current)
    burst.current = 0
    setValue("")
    const code = cleanScan(text)
    if (code) onScan(code)
    input.current?.focus()
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <ScanLineIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={input}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label="Serial number"
          placeholder={placeholder}
          disabled={disabled}
          className="h-12 pl-10 text-base"
          value={value}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Tab" || event.key === ";") {
              event.preventDefault()
              commit(value)
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text")
            if (!/[\r\n]/.test(text)) return
            event.preventDefault()
            for (const line of text.split(/[\r\n]+/)) {
              const code = cleanScan(line)
              if (code) onScan(code)
            }
          }}
          onChange={(event) => {
            const next = event.target.value
            if (next.includes(";")) return commit(next)
            const now = Date.now()
            burst.current = now - lastKey.current < BURST_GAP_MS ? burst.current + 1 : 1
            lastKey.current = now
            setValue(next)
            clearTimeout(idle.current)
            if (burst.current >= BURST_MIN) idle.current = setTimeout(() => commit(next), IDLE_MS)
          }}
        />
      </div>
      <Button type="button" variant="outline" className="h-12" disabled={disabled || cleanScan(value) === ""} onClick={() => commit(value)}>
        Add
      </Button>
    </div>
  )
}
