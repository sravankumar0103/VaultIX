# Admin Delete Email Setup

To send the account deletion email when you delete a user directly from Supabase Auth:

1. Add `ACCOUNT_DELETE_WEBHOOK_SECRET` to your app environment.
2. Open `supabase/migrations/20260401_send_deleted_account_email.sql`.
3. Replace the placeholder URL with your public VaultIX app URL.
4. Replace the placeholder secret with the same `ACCOUNT_DELETE_WEBHOOK_SECRET` value.
5. Run that SQL in the Supabase SQL editor once.

Use a public URL for the webhook. Supabase cannot call `http://localhost:3000` directly.
