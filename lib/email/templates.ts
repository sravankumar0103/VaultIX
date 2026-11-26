import { escapeHtml, stripLineBreaks } from "@/lib/email/escapeHtml"

export type EmailContent = { subject: string; html: string }

export function buildWelcomeEmail(name: string): EmailContent {
  return {
    subject: `Welcome to VaultIX, ${stripLineBreaks(name)}!`,
    html: `
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
                .content-box { background-color: #09090b !important; border-color: #27272a !important; }
                .footer { background-color: #18181b !important; border-color: #27272a !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0;">
            <div class="email-body" style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
              <div class="email-card" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                
                <!-- Branding Header -->
                <div style="padding: 32px 32px 24px 32px; text-align: left;">
                  <span class="logo-vault" style="font-size: 24px; font-weight: 800; letter-spacing: -0.025em; color: #0f172a;">Vault<span style="color: #8b5cf6;">IX</span></span>
                </div>

                <div style="padding: 0 32px 32px 32px;">
                  <h1 class="text-primary" style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Hi ${escapeHtml(name)}!</h1>
                  
                  <p class="text-secondary" style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                    Welcome to <strong>VaultIX</strong>. I'm <strong>Sravan Kumar</strong>, and I'm thrilled to have you here. This space is designed to make your digital life simpler, more organized, and completely secure.
                  </p>

                  <div class="content-box" style="background-color: #f1f5f9; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 32px;">
                    <h2 class="text-primary" style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 20px;">Ready to get started?</h2>
                    
                    <div style="margin-bottom: 20px;">
                      <strong class="text-primary" style="color: #0f172a; display: block; font-size: 14px; margin-bottom: 4px;">1. Smart Bookmarking</strong>
                      <span class="text-secondary" style="color: #64748b; font-size: 13px;">Our AI automatically categorizes and tags your saves as you add them.</span>
                    </div>

                    <div style="margin-bottom: 20px;">
                      <strong class="text-primary" style="color: #0f172a; display: block; font-size: 14px; margin-bottom: 4px;">2. Personalize Your Space</strong>
                      <span class="text-secondary" style="color: #64748b; font-size: 13px;">Set your preferred theme (Light/Dark) in your account settings.</span>
                    </div>

                    <div>
                      <strong class="text-primary" style="color: #0f172a; display: block; font-size: 14px; margin-bottom: 4px;">3. Stay Secure</strong>
                      <span class="text-secondary" style="color: #64748b; font-size: 13px;">Your data is protected by industry-standard encryption, so you can save with total confidence.</span>
                    </div>
                  </div>

                  <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                    <p class="text-secondary" style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Best regards,</p>
                    <p class="text-primary" style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">Sravan Kumar</p>
                    <p style="font-size: 13px; color: #8b5cf6; margin-top: -12px;">Founder, VaultIX</p>
                  </div>
                </div>

                <!-- Internal Footer -->
                <div class="footer" style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: left;">
                  <p style="margin: 0; color: #94a3b8; font-size: 11px;">&copy; 2026 VaultIX. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
  }
}

export function buildFeedbackEmail(input: {
  userName: string
  userEmail: string
  subject: string
  body: string
}): EmailContent {
  const { userName, userEmail, subject, body } = input

  return {
    subject: `[VaultIX] ${stripLineBreaks(subject)}`,
    html: `
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
                .content-box { background-color: #09090b !important; border-color: #27272a !important; }
                .footer { background-color: #18181b !important; border-color: #27272a !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0;">
            <div class="email-body" style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
              <div class="email-card" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                
                <!-- Branding Header -->
                <div style="padding: 32px 32px 24px 32px; text-align: left;">
                  <span class="logo-vault" style="font-size: 24px; font-weight: 800; letter-spacing: -0.025em; color: #0f172a;">Vault<span style="color: #9C27B0;">IX</span></span>
                </div>


                <div style="padding: 0 32px 32px 32px;">
                  <!-- User Info Section (Minimalist) -->
                  <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
                    <h3 class="text-primary" style="margin: 0; color: #0f172a; font-size: 15px; font-weight: 600;">Feedback from ${escapeHtml(userName)}</h3>
                    <a href="mailto:${escapeHtml(userEmail)}" class="text-secondary" style="margin: 0; color: #64748b; font-size: 13px; text-decoration: none;">${escapeHtml(userEmail)}</a>
                  </div>

                  <!-- Content Area (No Labels) -->
                  <div class="content-box" style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                    <p class="text-primary" style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600; line-height: 1.4;">${escapeHtml(subject)}</p>
                    <p class="text-secondary" style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(body)}</p>
                  </div>

                  <!-- Reply Action -->
                  <div style="margin-top: 32px; text-align: left;">
                    <a href="mailto:${escapeHtml(userEmail)}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.2);">Reply Directly</a>
                  </div>
                </div>

                <!-- Internal Footer -->
                <div class="footer" style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: left;">
                  <p style="margin: 0; color: #94a3b8; font-size: 11px;">This is a priority user report from VaultIX.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
  }
}

export function buildAccountDeletedEmail(name: string): EmailContent {
  return {
    subject: "Account Permanently Deleted - VaultIX",
    html: `
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
                Hi ${escapeHtml(name)},<br><br>
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
  `,
  }
}
