# Supabase setup

Everything in `supabase/migrations/` is applied **by hand** in the Supabase SQL editor (project
`vaultix`, branch `main`). Paste one file's full text, run it, read its NOTICE lines. No file
contains a secret or a real address, and none is run by the app.

## Migrations and apply order

| Order | File | What it does | Depends on |
|---|---|---|---|
| (history) | `20260101_baseline_live_schema.sql` | Documents the live schema as exported on 26 Nov 2026 (tables, policies, bucket, triggers, extensions). **Do not run it on production.** | none |
| (history) | `20260401_send_deleted_account_email.sql` | Legacy file, now reduced to `create extension if not exists pg_net` (its function body, secret and host were removed). C3 replaces the function and trigger. | none |
| C2 | `20261125_02_user_foreign_keys.sql` | `complaints.user_id` becomes `ON DELETE CASCADE`; `bookmarks.user_id` gets an FK to `auth.users` with cascade, default `auth.uid()` and `NOT NULL` (validated only when no row breaks it). | none: safe to apply now |
| C3 | `20261125_03_account_deleted_webhook_vault.sql` | Replaces `notify_vaultix_account_deleted()` and the trigger on `auth.users`: URL and secret are read from Vault, the trigger is `BEFORE DELETE`, and a failure never blocks a user deletion. | C2, **and** the two Vault secrets below must exist |
| C4 | `20261125_04_bookmarks_complaints_hardening.sql` | `bookmarks.created_at` default and `NOT NULL`, CHECK constraints, indexes, `update_updated_at` search path, complaints grants; **a storage DELETE policy** for the `media` bucket (owner-scoped, so deleting a bookmark removes its file from the browser); **removes the typo default `'nullable'`** from `bookmarks.media_url` (rows that already hold that text are only counted); rewrites the four live `bookmarks` policies to the equivalent `(select auth.uid()) = user_id`. | Apply **only after the branch is deployed** (the old client inserted into `complaints` directly and that insert is refused afterwards) |

Notes on the order:

- File `20261125_01` was dropped on 26 Nov 2026: the live `bookmarks` RLS is already owner-scoped, so that migration was redundant. The numbers `_02`, `_03` and `_04` are kept as they are.
- Apply C3 right after C2. Between C2 and C3 do not delete users from the Supabase dashboard: after C2 the cascade removes the bookmark rows before the old trigger could read their media paths.
- Never apply C3 before the Vault secrets exist. Without them the trigger only logs a warning and
  no deletion mail is sent.
- Apply C4 last, after the deploy. Its last result set is a summary table of 25 rows: read the "actual" column against "expected" (the storage and policy rows print the real policy text).
- If C4 prints that it could not create the storage policy (the SQL editor role may lack the privilege on `storage.objects`), create it by hand in the dashboard (Storage → Policies → `media` → New policy → For full customization), with the name EXACTLY as below (the summary row looks for it), then run the summary again:
  ```sql
  create policy "Users can delete their own media" on storage.objects
    for delete to authenticated
    using (bucket_id = 'media' and (owner_id = (select auth.uid())::text or owner = (select auth.uid())));
  ```
- Every file is idempotent and deletes no rows. A NOTICE that says "ask the owner" means some rows
  were left as they are and need a decision.

## Vault setup (before C3)

The webhook secret and URL live only in Supabase Vault. Run these in the SQL editor, one block at a
time. Never write a value into a file, a chat or a log.

1. Check that the vault extension and helpers exist (names only). If `supabase_vault` is missing,
   enable it under Database, Extensions.
2. Create `vaultix_account_deleted_webhook_secret` with `vault.create_secret(...)` using random
   bytes generated in SQL, so the value never appears in the SQL text.
3. Create `vaultix_account_deleted_webhook_url` with `vault.create_secret(...)`:
   `https://<your-domain>/api/auth/account-deleted` (not secret, but kept in Vault so a domain
   change needs no code or SQL edit).
4. Read the secret once from `vault.decrypted_secrets` and copy it into Vercel as
   `ACCOUNT_DELETE_WEBHOOK_SECRET` (Production, and Preview if used). Redeploy. Clear the result
   grid.
5. If a name already exists (a re-run), use `vault.update_secret(...)` instead of `create_secret`.

The route compares the `x-vaultix-webhook-secret` header with `ACCOUNT_DELETE_WEBHOOK_SECRET` in
constant time. A wrong secret returns `401`.

Supabase cannot call `http://localhost:3000`. The URL in Vault must be public, so the webhook
cannot be checked end to end on a local machine.

## Auth URL configuration (Authentication, URL Configuration)

As recorded on 25 Nov 2026:

- Site URL: `https://vaultix-sk.vercel.app`
- Redirect allow-list, four exact entries, no wildcards:
  - `https://vaultix-sk.vercel.app/dashboard`
  - `https://vaultix-sk.vercel.app/auth?profile=1`
  - `http://localhost:3000/dashboard`
  - `http://localhost:3000/auth?profile=1`

The PKCE sign-in flow redirects back to those same paths, so it needs no new entry. A new redirect
path must be added here **before** it is deployed.

## Changing the production domain

No code change is needed. Do all of these:

1. Supabase, Authentication, URL Configuration: change the Site URL to the new host.
2. Add both redirect entries for the new host (`https://<new-host>/dashboard` and
   `https://<new-host>/auth?profile=1`). Keep the localhost entries.
3. Point the webhook at the new host:
   `select vault.update_secret((select id from vault.secrets where name = 'vaultix_account_deleted_webhook_url'), 'https://<new-host>/api/auth/account-deleted');`
4. Vercel, Settings, Domains: add the new domain.
5. Then remove the old host's redirect entries.

## Media bucket: size limit and orphan files

- The `media` bucket allows files up to **10 MB** (`file_size_limit` 10485760). The app checks the
  same limit before upload (`MEDIA_MAX_BYTES` in `lib/mediaStorage.ts`), so a larger file is
  refused with a clear message instead of failing at Supabase. Change both together.
- Until C4 there was no DELETE policy on `storage.objects`, so the browser could never remove a
  file. Files of bookmarks deleted before that (5 of 14 on 26 Nov 2026) are orphans: nothing
  points at them. Supabase blocks `delete from storage.objects` in SQL, so they are removed in
  the dashboard.

Clean up the orphans by hand:

1. Run this read-only query in the SQL editor to list them:

   ```sql
   select o.name, o.created_at
     from storage.objects o
    where o.bucket_id = 'media'
      and not exists (select 1 from public.bookmarks b where b.media_url like '%/media/' || o.name)
    order by o.created_at;
   ```

2. Dashboard, Storage, `media`: select each listed file and delete it.
3. Run the query again and confirm it returns 0 rows.

In `like`, an underscore in a file name matches any character, so the query can match a file to
the wrong bookmark. That can only make the list shorter than the real one, never longer: it never
lists a file a bookmark still uses. If it shows 0 rows, no file is known to be orphaned.

## Live facts worth knowing

- `bookmarks.visit_count` is never read or written by the code. It is kept on purpose.
- `complaints.user_id` references `auth.users`; C2 gives it `ON DELETE CASCADE`.
- `bookmarks` is in the `supabase_realtime` publication.
- The media bucket is `media` (public, 10 MB limit, no MIME restriction); media paths are flat object names.
- `storage.objects` has two policies live (INSERT and SELECT, both for `authenticated`, `true`); C4 adds the owner-scoped DELETE policy.
- PostgREST max-rows (Project Settings, API): unknown until Gate A (the owner's schema export and
  dashboard value). Bookmark lists are read in full, so a low value would truncate them.
- `bookmarks` has four owner-scoped RLS policies (select, insert, update, delete), so no migration is needed to create them; C4 only rewrites their text. Gate A export of 26 Nov 2026: `docs/superpowers/audit/DECISIONS.md`.
