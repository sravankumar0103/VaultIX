import nodemailer from "nodemailer"

const globalForMailer = globalThis as typeof globalThis & {
  __vaultixMailTransporter?: nodemailer.Transporter
}

export function getMailTransporter() {
  if (!globalForMailer.__vaultixMailTransporter) {
    globalForMailer.__vaultixMailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    })
  }

  return globalForMailer.__vaultixMailTransporter
}
