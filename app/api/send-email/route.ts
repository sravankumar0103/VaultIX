import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

export async function POST(req: NextRequest) {
    try {
        const { subject, body, userEmail, userName } = await req.json();

        const mailOptions = {
            from: `"VaultIX" <${process.env.GMAIL_USER}>`,
            to: 'sravankumar0103@gmail.com',
            replyTo: userEmail,
            subject: `[VaultIX] ${subject}`,
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
                    <h3 class="text-primary" style="margin: 0; color: #0f172a; font-size: 15px; font-weight: 600;">Feedback from ${userName}</h3>
                    <a href="mailto:${userEmail}" class="text-secondary" style="margin: 0; color: #64748b; font-size: 13px; text-decoration: none;">${userEmail}</a>
                  </div>

                  <!-- Content Area (No Labels) -->
                  <div class="content-box" style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                    <p class="text-primary" style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600; line-height: 1.4;">${subject}</p>
                    <p class="text-secondary" style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${body}</p>
                  </div>

                  <!-- Reply Action -->
                  <div style="margin-top: 32px; text-align: left;">
                    <a href="mailto:${userEmail}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.2);">Reply Directly</a>
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
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Email API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
