// Text extraction can bring line breaks and repeated spaces; anything after ";" is a scanner suffix.
export const cleanScan = (text: string) => text.split(";")[0]!.replace(/\s+/g, " ").trim()

// Short vibration on the phone: one buzz for a good scan, a long one for a refused scan.
export function scanFeedback(ok: boolean) {
  navigator.vibrate?.(ok ? 40 : [150, 80, 150])
}
