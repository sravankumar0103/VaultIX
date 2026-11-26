-- Baseline: documentation of the live schema as exported on 26 Nov 2026.
-- DO NOT RUN ON PRODUCTION. It exists to describe what the live project holds, so a
-- fresh project can be compared against it. No secret and no real address appear here.
--
-- Source: the owner's Gate A schema export of 26 Nov 2026, summarised in
-- docs/superpowers/audit/DECISIONS.md (section 2 and "Gate A export results"). Only facts
-- from that export are written here. Where the export did not record something (for
-- example the events of a trigger or the body of a Supabase-provided function), the file
-- says so in a comment and does not guess.
--
-- Written with "create ... if not exists" and guarded "do" blocks (a policy is created
-- only when no policy of that name exists), so a run on the live project would change
-- nothing. Live values that are wrong are marked "live value" and fixed by a later file:
-- 20261125_02 (foreign keys), 20261125_03 (account-deleted webhook), 20261125_04
-- (hardening). (20261125_01 was dropped on 26 Nov 2026: the live bookmarks RLS is already
-- owner-scoped.)

-- Extensions present live. Their schemas are not recorded in the export except pg_net.
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists pg_net with schema extensions;   -- 0.19.5
create extension if not exists supabase_vault;                  -- 0.3.1
-- Also present: plpgsql and pg_stat_statements.

-- public.bookmarks: 14 columns, 28 rows live. The code mirrors it in types/bookmark.ts.
-- Primary key: id (the only index; nothing else is indexed live).
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,                                  -- nullable, no default, no FK live (20261125_02)
  url text,
  created_at timestamptz default now(),          -- nullable live (20261125_04 sets NOT NULL)
  title text not null,
  description text,
  category text default 'General',
  tags text[],
  domain text,
  visit_count int4 default 0,                    -- never read or written by the code; kept
  is_archived boolean default false,
  updated_at timestamptz default now(),          -- kept current by trigger update_bookmarks_updated_at
  priority int4 default 1,                       -- replaced the dropped "importance" column
  media_url text default 'nullable'::text        -- live value, fixed by 20261125_04 (typo: should be NULL)
);

-- public.complaints: 7 columns, 6 rows live (all status 'pending').
-- Primary key: id (the only index). The FK has no ON DELETE rule live, which is NO ACTION
-- (20261125_02 changes it to ON DELETE CASCADE).
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  user_id uuid,
  user_email text,
  subject text,
  body text,
  status text default 'pending',
  constraint complaints_user_id_fkey foreign key (user_id) references auth.users (id)
);

-- Row Level Security: on for both tables.
alter table public.bookmarks enable row level security;
alter table public.complaints enable row level security;

-- Policies on public.bookmarks: four, all for role public (no TO clause), all owner-scoped.
-- 20261125_04 rewrites their text to "(select auth.uid()) = user_id" (same meaning).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bookmarks'
                  and policyname = 'Users can view their own bookmarks') then
    create policy "Users can view their own bookmarks" on public.bookmarks
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bookmarks'
                  and policyname = 'Users can insert their own bookmarks') then
    create policy "Users can insert their own bookmarks" on public.bookmarks
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bookmarks'
                  and policyname = 'Users can update their own bookmarks') then
    create policy "Users can update their own bookmarks" on public.bookmarks
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bookmarks'
                  and policyname = 'Users can delete their own bookmarks') then
    create policy "Users can delete their own bookmarks" on public.bookmarks
      for delete using (user_id = auth.uid());
  end if;
end $$;

-- Policy on public.complaints: ONE, INSERT only, role public. No SELECT, UPDATE or DELETE
-- policy exists, so users cannot read complaints back.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'complaints'
                  and policyname = 'Users can insert their own complaints') then
    create policy "Users can insert their own complaints" on public.complaints
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- Storage bucket "media" (14 objects live, 5 of them referenced by no bookmark).
-- Public: files are served from /storage/v1/object/public/media/ without a policy check.
-- file_size_limit is 10 MB (10485760); the app's MEDIA_MAX_BYTES in lib/mediaStorage.ts
-- matches it. No MIME restriction (allowed_mime_types is null).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, null)
on conflict (id) do nothing;

-- Policies on storage.objects live: two, both for role authenticated, and no UPDATE or
-- DELETE policy. The names end in "1ps738_0" because the dashboard generated them. The
-- "public read" one is for role authenticated, not public. 20261125_04 adds the missing
-- owner-scoped DELETE policy ("Users can delete their own media").
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                  and policyname = 'Allow authenticated uploads 1ps738_0') then
    create policy "Allow authenticated uploads 1ps738_0" on storage.objects
      for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                  and policyname = 'Allow public read 1ps738_0') then
    create policy "Allow public read 1ps738_0" on storage.objects
      for select to authenticated using (true);
  end if;
end $$;

-- Functions (public). Only update_updated_at() is created here, and only when absent
-- (create or replace would wipe the search_path that 20261125_04 pins on it).
--   update_updated_at()               trigger function, security invoker. Its body is
--       "NEW.updated_at = now(); RETURN NEW;". No search_path live (20261125_04 pins it).
--   notify_vaultix_account_deleted()  trigger function, security definer, search_path
--       public. Described only, never reproduced: its live body still holds the old webhook
--       secret and host. 20261125_03 replaces it (secret and URL from Vault).
--   rls_auto_enable()                 event trigger function, security definer,
--       Supabase-provided (turns RLS on for new tables). The export did not record its body.
do $$
begin
  if to_regprocedure('public.update_updated_at()') is null then
    execute $f$
      create function public.update_updated_at() returns trigger
      language plpgsql as $body$
      begin
        new.updated_at = now();
        return new;
      end;
      $body$
    $f$;
  end if;
end $$;

-- Triggers, described only (the export recorded names, not definitions of the first):
--   update_bookmarks_updated_at on public.bookmarks: keeps updated_at current through
--       update_updated_at(). Its events and timing were not recorded in the export.
--   vaultix_account_deleted_email_trigger on auth.users: AFTER DELETE, calls
--       notify_vaultix_account_deleted(). 20261125_03 recreates it as BEFORE DELETE.

-- Realtime: the supabase_realtime publication contains public.bookmarks and nothing else.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
                      and schemaname = 'public' and tablename = 'bookmarks') then
    alter publication supabase_realtime add table public.bookmarks;
  end if;
end $$;
