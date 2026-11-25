import nodemailer, { type Transporter } from "nodemailer"

import { requireEnv } from "@/lib/env"

const globalForMailer = globalThis as typeof globalThis & {
  __vaultixMailTransporter?: Transporter
}

export function getMailTransporter() {
  if (!globalForMailer.__vaultixMailTransporter) {
    globalForMailer.__vaultixMailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: requireEnv("GMAIL_USER"),
        pass: requireEnv("GMAIL_PASS"),
      },
    })
  }

  return globalForMailer.__vaultixMailTransporter
}
