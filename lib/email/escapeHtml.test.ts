import { describe, expect, it } from "vitest"

import { escapeHtml, stripLineBreaks } from "@/lib/email/escapeHtml"

describe("escapeHtml", () => {
  it("escapes & < > \" and '", () => {
    expect(escapeHtml(`<b>x</b> & "y" 'z'`)).toBe(
      "&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot; &#39;z&#39;"
    )
  })

  it("turns line breaks into one space", () => {
    expect(stripLineBreaks("a\r\nb\nc")).toBe("a b c")
  })
})
