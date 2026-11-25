export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

// For mail headers such as the subject: a run of CR/LF becomes one space so a value
// can never start a new header line.
export function stripLineBreaks(value: string): string {
  return value.replace(/[\r\n]+/g, " ")
}
