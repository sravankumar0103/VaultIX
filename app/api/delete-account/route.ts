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

// Admin client uses service role key — server-side only, never exposed to the browser
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
    try {
        // Verify the caller is an authenticated user by reading their JWT
        const authHeader = req.headers.get("Authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.replace("Bearer ", "")

        // Verify the token and get the user's real ID
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        const userId = user.id
        const userEmail = user.email!
        const userName = user.user_metadata?.full_name || user.user_metadata?.name || "Customer"

        // 1. Fetch all bookmarks to get media_url paths for storage cleanup
        const { data: userBookmarks } = await supabaseAdmin
            .from("bookmarks")
            .select("media_url")
            .eq("user_id", userId)

        // 2. Delete all media files from storage
        if (userBookmarks && userBookmarks.length > 0) {
            const storagePrefix = "/storage/v1/object/public/media/"
            const filePaths = userBookmarks
                .filter((b) => b.media_url)
                .map((b) => {
                    const url = b.media_url
                    const idx = url.indexOf(storagePrefix)
                    return idx !== -1 ? url.slice(idx + storagePrefix.length) : null
                })
                .filter(Boolean) as string[]

            if (filePaths.length > 0) {
                const { error: storageError } = await supabaseAdmin.storage
                    .from("media")
                    .remove(filePaths)
                if (storageError) {
                    console.error("Storage cleanup error (non-fatal):", storageError)
                }
            }
        }

        // 3. Delete from COMPLAINTS table
        const { error: complaintsError } = await supabaseAdmin
            .from("complaints")
            .delete()
            .eq("user_id", userId)
        
        if (complaintsError) {
            console.error("Complaints deletion error:", complaintsError)
            return NextResponse.json({ error: "Failed to purge user feedback data" }, { status: 500 })
        }

        // 4. Delete all BOOKMARKS from DB
        const { error: bookmarksError } = await supabaseAdmin
            .from("bookmarks")
            .delete()
            .eq("user_id", userId)
        
        if (bookmarksError) {
            console.error("Bookmarks deletion error:", bookmarksError)
            return NextResponse.json({ error: "Failed to purge user bookmarks" }, { status: 500 })
        }

        // 5. Send Farewell Email
        try {
            await transporter.sendMail({
                from: `"VaultIX" <${process.env.GMAIL_USER}>`,
                to: userEmail,
                subject: "Account Permanently Deleted — VaultIX",
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
                
                <!-- Branding Header -->
                <div style="padding: 32px 32px 24px 32px; text-align: left;">
                  <span class="logo-vault" style="font-size: 24px; font-weight: 800; letter-spacing: -0.025em; color: #0f172a;">Vault<span style="color: #8b5cf6;">IX</span></span>
                </div>

                <div style="padding: 0 32px 32px 32px;">
                  <h1 class="text-primary" style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 20px;">Your account has been deleted.</h1>
                  
                  <p class="text-secondary" style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                    Hi ${userName},<br><br>
                    We're confirming that your VaultIX account has been permanently deleted as requested. All your bookmarks, files, and personal data have been completely removed from our systems.
                  </p>

                  <p class="text-secondary" style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
                    We're sorry to see you go, but we respect your choice. If you ever change your mind, you can always create a new account and start fresh.
                  </p>

                  <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                    <p class="text-secondary" style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Thank you for using VaultIX,</p>
                    <p class="text-primary" style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">Sravan Kumar</p>
                    <p style="font-size: 13px; color: #8b5cf6; margin-top: -12px;">Founder, VaultIX</p>
                  </div>
                </div>

                <!-- Footer -->
                <div class="footer" style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: left;">
                  <p style="margin: 0; color: #94a3b8; font-size: 11px;">This is an automated confirmation of account removal.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
                `
            });
        } catch (emailErr) {
            console.error("Farewell email failed (non-blocking):", emailErr);
        }

        // 6. Delete the Supabase Auth user (requires service role)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteError) {
            console.error("Auth delete error:", deleteError)
            return NextResponse.json({ error: `Auth deletion failed: ${deleteError.message}` }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error("Delete account error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
