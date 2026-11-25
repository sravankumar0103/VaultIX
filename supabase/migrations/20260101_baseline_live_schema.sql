-- Baseline: documentation of the live schema as known on 2026-11-26.
-- DO NOT RUN ON PRODUCTION. It exists to describe what the live project holds, so a
-- fresh project can be compared against it. No secret and no real address appear here.
--
-- Source: the owner's screenshots and SQL editor history (25 Nov 2026), as recorded in
-- docs/superpowers/audit/DECISIONS.md section 2. The Gate A export
-- (docs/superpowers/audit/schema-export.sql) has not been supplied, so anything not
-- listed there is marked "UNKNOWN until the Gate A export" and is never guessed.
--
-- Written with "create ... if not exists" and guarded blocks, so running it on the live
-- project would change nothing. The files 20261125_01..04 change the schema afterwards;
-- they are mentioned in comments only.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists pg_net with schema extensions;
-- Also enabled live: plpgsql, pg_stat_statements.

-- public.bookmarks (14 columns). The code mirrors it in types/bookmark.ts.
create table if not exists public.bookmarks (
  id uuid primary key,                           -- live default UNKNOWN until the Gate A export
  user_id uuid,                                  -- nullable, no FK live (see 20261125_02)
  url text,
  created_at timestamptz,                        -- nullable, no default live (see 20261125_04)
  title text not null,
  description text,
  category text default 'General',
  tags text[],
  domain text,
  visit_count int4 default 0,                    -- never read or written by the code; kept
  is_archived boolean default false,
  updated_at timestamptz,                        -- kept current by update_bookmarks_updated_at
  priority int4 default 1,                       -- replaced the dropped "importance" column
  media_url text                                 -- public URL into the "media" bucket
);

-- public.complaints (7 columns).
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  user_id uuid references auth.users (id),       -- NO ACTION live (see 20261125_02)
  user_email text,
  subject text,
  body text,
  status text default 'pending'
);

-- Row Level Security.
alter table public.complaints enable row level security;
-- bookmarks RLS state and policies: UNKNOWN until the Gate A export
-- (docs/superpowers/audit/schema-export.sql). See 20261125_01_bookmarks_rls.sql.

-- complaints has ONE policy: INSERT, with check (auth.uid() = user_id). Its NAME is UNKNOWN
-- until the Gate A export, so nothing is created here. No SELECT, UPDATE or DELETE
-- policy exists on complaints.

-- Indexes: UNKNOWN until the Gate A export (20261125_04 adds the ones the app needs).

-- Functions (public), described only; bodies live in their own files:
--   notify_vaultix_account_deleted()  trigger function, security definer. Replaced by
--       20261125_03_account_deleted_webhook_vault.sql (secret and URL from Vault).
--   rls_auto_enable()                 event trigger, security definer, Supabase-provided.
--   update_updated_at()               trigger function, security invoker, sets
--       NEW.updated_at = now(). No search_path live (pinned by 20261125_04).

-- Triggers:
--   update_bookmarks_updated_at on public.bookmarks (kept current updated_at).
--   vaultix_account_deleted_email_trigger on auth.users: existence UNKNOWN until the
--       Gate A export. 20261125_03 creates it as BEFORE DELETE.

-- Realtime: public.bookmarks is in the supabase_realtime publication.

-- Storage: bucket "media" (public URLs under /storage/v1/object/public/media/).
-- The bucket row (public flag, file_size_limit, allowed mime types) and the
-- storage.objects policies are UNKNOWN until the Gate A export. Nothing is created here.
