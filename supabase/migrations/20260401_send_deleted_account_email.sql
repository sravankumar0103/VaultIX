-- Run this in the Supabase SQL editor once to send deletion emails
-- for admin-side auth user deletions.
-- Self-service deletions from the app set skip_account_deleted_email_webhook = true
-- first, so they keep using the app route without sending a duplicate email.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_vaultix_account_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email is null then
    return old;
  end if;

  if coalesce(old.raw_app_meta_data ->> 'skip_account_deleted_email_webhook', 'false') = 'true' then
    return old;
  end if;

  perform extensions.net.http_post(
    url := 'https://vault-ix-ten.vercel.app/api/auth/account-deleted',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-vaultix-webhook-secret', 'vaultix_webhook_secret_010304vault'
    ),
    body := jsonb_build_object(
      'userId', old.id,
      'email', old.email,
      'fullName', coalesce(
        old.raw_user_meta_data ->> 'full_name',
        old.raw_user_meta_data ->> 'name',
        split_part(old.email, '@', 1),
        'Customer'
      )
    )
  );

  return old;
end;
$$;

drop trigger if exists vaultix_account_deleted_email_trigger on auth.users;

create trigger vaultix_account_deleted_email_trigger
after delete on auth.users
for each row execute function public.notify_vaultix_account_deleted();
