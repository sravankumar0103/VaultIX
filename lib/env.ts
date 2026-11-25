// Client-safe: no server-only imports here. `requireEnv` reads `process.env` by name,
// so only call it from server code (route handlers, `lib/server/*`).

export function requireValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}`)
  }

  return value
}

export function requireEnv(name: string): string {
  return requireValue(process.env[name], name)
}
