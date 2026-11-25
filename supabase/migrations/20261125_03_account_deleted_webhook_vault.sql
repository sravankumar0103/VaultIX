-- Account-deleted webhook: secret and URL from Supabase Vault (D1, D2).
--
-- Replaces public.notify_vaultix_account_deleted() and the trigger
-- vaultix_account_deleted_email_trigger on auth.users that
-- 20260401_send_deleted_account_email.sql used to create.
--
-- Apply order (by hand, in the Supabase SQL editor):
--   1. AFTER 20261125_02_user_foreign_keys.sql, so the user's bookmarks are
--      cascade-deleted with the auth user and the webhook's shared-media check
--      sees only other users' rows.
--   2. AFTER Gate 0 created both Vault secrets:
--        vaultix_account_deleted_webhook_secret  (same value as ACCOUNT_DELETE_WEBHOOK_SECRET in Vercel)
--        vaultix_account_deleted_webhook_url     (https://<your-domain>/api/auth/account-deleted)
--
-- The URL and the secret live ONLY in Vault. Never paste either into this file or
-- any other committed SQL. A domain change is one Vault update, no migration:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'vaultix_account_deleted_webhook_url'),
--     'https://<your-domain>/api/auth/account-deleted');
--
-- Safe to re-run: create ... if not exists / create or replace, and the only drop is
-- this project's own trigger, recreated in the same script. Deletes no data.
--
-- The trigger never blocks a user deletion: a missing Vault secret or any error while
-- building or queueing the request only raises a warning, and every path returns OLD.
-- Users deleted through /api/delete-account carry app_metadata
-- skip_account_deleted_email_webhook = true, because that route sends its own email.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_vaultix_account_deleted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text; v_paths jsonb;
begin
  if old.email is null then return old; end if;
  if coalesce(old.raw_app_meta_data ->> 'skip_account_deleted_email_webhook', 'false') = 'true' then return old; end if;
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'vaultix_account_deleted_webhook_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'vaultix_account_deleted_webhook_secret';
    if v_url is null or v_secret is null then
      raise warning 'vaultix: account-deleted webhook is not configured in Vault; no email sent';
      return old;
    end if;
    -- '/storage/v1/object/public/media/' is 32 characters, so the object name starts
    -- at its position + 32.
    select coalesce(jsonb_agg(substring(b.media_url from position('/storage/v1/object/public/media/' in b.media_url) + 32)), '[]'::jsonb)
      into v_paths
      from public.bookmarks b
     where b.user_id = old.id and b.media_url like '%/storage/v1/object/public/media/%';
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-vaultix-webhook-secret', v_secret),
      body := jsonb_build_object(
        'userId', old.id, 'email', old.email,
        'fullName', coalesce(old.raw_user_meta_data ->> 'full_name', old.raw_user_meta_data ->> 'name', split_part(old.email, '@', 1), 'Customer'),
        'mediaPaths', v_paths));
  exception when others then
    raise warning 'vaultix: account-deleted webhook failed: %', sqlerrm;
  end;
  return old;
end $$;

-- BEFORE DELETE so the user's bookmarks (and their media paths) still exist when this runs (P3).
-- Same-transaction replace of this project's own trigger; nothing else depends on it.
drop trigger if exists vaultix_account_deleted_email_trigger on auth.users;
create trigger vaultix_account_deleted_email_trigger
  before delete on auth.users
  for each row execute function public.notify_vaultix_account_deleted();
