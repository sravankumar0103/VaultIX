import { requireEnv } from "@/lib/env"
import {
  buildAccountDeletedEmail,
  buildFeedbackEmail,
  buildWelcomeEmail,
} from "@/lib/email/templates"
import { getMailTransporter } from "@/lib/mailer"

type SendAccountDeletedEmailInput = {
  email: string
  name?: string | null
}

type SendWelcomeEmailInput = {
  email: string
  name: string
}

type SendFeedbackEmailInput = {
  to: string
  replyTo: string
  userName: string
  userEmail: string
  subject: string
  body: string
}

function getRecipientName(name?: string | null) {
  const trimmedName = name?.trim()

  if (trimmedName) {
    return trimmedName
  }

  return "Customer"
}

function getFromAddress() {
  return `"VaultIX" <${requireEnv("GMAIL_USER")}>`
}

export async function sendAccountDeletedEmail({
  email,
  name,
}: SendAccountDeletedEmailInput) {
  const transporter = getMailTransporter()
  const { subject, html } = buildAccountDeletedEmail(getRecipientName(name))

  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject,
    html,
  })
}

export async function sendWelcomeEmail({ email, name }: SendWelcomeEmailInput) {
  const transporter = getMailTransporter()
  const { subject, html } = buildWelcomeEmail(name)

  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject,
    html,
  })
}

export async function sendFeedbackEmail({
  to,
  replyTo,
  userName,
  userEmail,
  subject,
  body,
}: SendFeedbackEmailInput) {
  const transporter = getMailTransporter()
  const content = buildFeedbackEmail({ userName, userEmail, subject, body })

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    replyTo,
    subject: content.subject,
    html: content.html,
  })
}
