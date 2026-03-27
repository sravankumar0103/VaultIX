import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function POST(req: NextRequest) {
  // Admin client to update user metadata (initialized inside to be build-safe)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if welcome email was already sent
    if (user.user_metadata?.welcome_sent) {
      return NextResponse.json({ success: true, message: "Welcome email already sent" })
    }

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || "there"
    const userEmail = user.email!

    // Send Welcome Email
    const mailOptions = {
      from: `"VaultIX" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `Welcome to VaultIX, ${userName}!`,
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
                  <h1 class="text-primary" style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Hi ${userName}!</h1>
                  
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
    };

    await transporter.sendMail(mailOptions);

    // Mark as sent in user metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, welcome_sent: true }
    })

    if (updateError) {
      console.error("Failed to update user metadata:", updateError)
    }

    return NextResponse.json({ success: true, message: "Welcome email sent" })
  } catch (err: any) {
    console.error("Welcome API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
