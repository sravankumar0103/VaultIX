import { NextResponse } from "next/server"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

export async function readJsonObject(
  req: Request
): Promise<Record<string, unknown> | null> {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return null
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null
  }

  return body as Record<string, unknown>
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}
