import { getMailTransporter } from "@/lib/mailer"

type SendAccountDeletedEmailInput = {
  email: string
  name?: string | null
}

function getRecipientName(name?: string | null) {
  const trimmedName = name?.trim()

  if (trimmedName) {
    return trimmedName
  }

  return "Customer"
}

function buildAccountDeletedEmailHtml(name: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          :root { color-scheme: light dark; }
          @media (prefers-color-scheme: dark) {
            .email-body { background-color: #09090b !important; }
            .email-card { background-color: #18181b !important; border-color: #27272a !important; }
            .logo-vault { color: #f8fafc !important; }
            .text-primary { color: #f8fafc !important; }
            .text-secondary { color: #a1a1aa !important; }
            .footer { background-color: #18181b !important; border-color: #27272a !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0;">
        <div class="email-body" style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
          <div class="email-card" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <div style="padding: 32px 32px 24px 32px; text-align: left;">
              <span class="logo-vault" style="font-size: 24px; font-weight: 800; letter-spacing: -0.025em; color: #0f172a;">Vault<span style="color: #8b5cf6;">IX</span></span>
            </div>

            <div style="padding: 0 32px 32px 32px;">
              <h1 class="text-primary" style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 20px;">Your account has been deleted.</h1>

              <p class="text-secondary" style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                Hi ${name},<br><br>
                We are confirming that your VaultIX account has been permanently deleted. All your bookmarks, files, and personal data have been removed from our systems.
              </p>

              <p class="text-secondary" style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
                If you ever want to come back, you can create a new account and start fresh at any time.
              </p>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                <p class="text-secondary" style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Thank you for using VaultIX,</p>
                <p class="text-primary" style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">Sravan Kumar</p>
                <p style="font-size: 13px; color: #8b5cf6; margin-top: -12px;">Founder, VaultIX</p>
              </div>
            </div>

            <div class="footer" style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: left;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">This is an automated confirmation of account removal.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function sendAccountDeletedEmail({
  email,
  name,
}: SendAccountDeletedEmailInput) {
  const transporter = getMailTransporter()
  const recipientName = getRecipientName(name)

  await transporter.sendMail({
    from: `"VaultIX" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Account Permanently Deleted - VaultIX",
    html: buildAccountDeletedEmailHtml(recipientName),
  })
}
