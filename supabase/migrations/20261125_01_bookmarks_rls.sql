-- Purpose: make sure public.bookmarks has Row Level Security on, with one policy per
-- command that limits every row to its owner ((select auth.uid()) = user_id).
--   V-039, V-102: the browser uses the anon key, so RLS is the only thing protecting
--     bookmark rows. This file makes sure RLS is on and owner policies exist.
--   V-097: INSERT gets a WITH CHECK, so a user cannot insert a row for someone else.
--   V-103: policies use the "(select auth.uid())" form (evaluated once per query,
--     not once per row) and are scoped "to authenticated".
--
-- Apply by hand in the Supabase SQL editor. Apply order (Gate C): C1, FIRST, before
-- every other file of this branch, as soon as it is reviewed.
--
-- Idempotent: running it twice changes nothing. Never destructive: no policy, row,
-- column or table is dropped or changed. A policy of the same name that already
-- exists is left exactly as it is (and its condition is printed so it can be checked).
-- Safe to apply even if RLS is already correct: it then only prints notices.
--
-- Why no existing feature can break:
--   - Every browser query on bookmarks (lib/useBookmarks.ts, lib/bookmarkMutations.ts
--     through the hook, app/dashboard/analytics/page.tsx) runs as the signed-in user
--     (role "authenticated") and already filters by that user's user_id. Inserts send
--     user_id = the signed-in user; updates never change user_id.
--   - The app never reads bookmarks as the "anon" role (signed out). After this file,
--     anon gets no bookmark rows at all, which is intended.
--   - Server routes (app/api/delete-account, lib/server/mediaCleanup.ts) use the
--     service-role client, which bypasses RLS, so they are unaffected.
--   - Realtime (postgres_changes on public.bookmarks) applies the SELECT policy, so
--     each user still receives the change events for their own rows only.
--
-- Not done here, on purpose: no DROP POLICY. The names and conditions of any policies
-- that already exist on bookmarks are not known until the owner's Gate A export.
-- Postgres ORs permissive policies together: a permissive policy that is looser than
-- auth.uid() = user_id still grants access in addition to these four. The last NOTICE
-- lists every other policy on bookmarks; review each against the Gate A export and drop
-- a loose one by hand if so.
--
-- Read the NOTICE lines in the editor's output: each one says what was created,
-- skipped, or needs review.

begin;

alter table public.bookmarks enable row level security;

do $$
declare
  v_existing text;
  v_others text;
begin
  -- SELECT
  select format('cmd=%s roles=%s using=%s', cmd, roles, coalesce(qual, '-'))
    into v_existing
    from pg_policies
   where schemaname = 'public' and tablename = 'bookmarks'
     and policyname = 'bookmarks_select_own';
  if v_existing is null then
    create policy bookmarks_select_own on public.bookmarks
      for select to authenticated
      using ((select auth.uid()) = user_id);
    raise notice 'bookmarks: created policy bookmarks_select_own';
  else
    raise notice 'bookmarks: policy bookmarks_select_own already exists, left as is (%): check it reads (select auth.uid()) = user_id', v_existing;
  end if;

  -- INSERT
  select format('cmd=%s roles=%s with_check=%s', cmd, roles, coalesce(with_check, '-'))
    into v_existing
    from pg_policies
   where schemaname = 'public' and tablename = 'bookmarks'
     and policyname = 'bookmarks_insert_own';
  if v_existing is null then
    create policy bookmarks_insert_own on public.bookmarks
      for insert to authenticated
      with check ((select auth.uid()) = user_id);
    raise notice 'bookmarks: created policy bookmarks_insert_own';
  else
    raise notice 'bookmarks: policy bookmarks_insert_own already exists, left as is (%): check it reads (select auth.uid()) = user_id', v_existing;
  end if;

  -- UPDATE
  select format('cmd=%s roles=%s using=%s with_check=%s', cmd, roles,
                coalesce(qual, '-'), coalesce(with_check, '-'))
    into v_existing
    from pg_policies
   where schemaname = 'public' and tablename = 'bookmarks'
     and policyname = 'bookmarks_update_own';
  if v_existing is null then
    create policy bookmarks_update_own on public.bookmarks
      for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
    raise notice 'bookmarks: created policy bookmarks_update_own';
  else
    raise notice 'bookmarks: policy bookmarks_update_own already exists, left as is (%): check it reads (select auth.uid()) = user_id', v_existing;
  end if;

  -- DELETE
  select format('cmd=%s roles=%s using=%s', cmd, roles, coalesce(qual, '-'))
    into v_existing
    from pg_policies
   where schemaname = 'public' and tablename = 'bookmarks'
     and policyname = 'bookmarks_delete_own';
  if v_existing is null then
    create policy bookmarks_delete_own on public.bookmarks
      for delete to authenticated
      using ((select auth.uid()) = user_id);
    raise notice 'bookmarks: created policy bookmarks_delete_own';
  else
    raise notice 'bookmarks: policy bookmarks_delete_own already exists, left as is (%): check it reads (select auth.uid()) = user_id', v_existing;
  end if;

  -- Every other policy on bookmarks: listed for review, never changed here.
  select string_agg(
           format('%s [%s %s roles=%s using=%s with_check=%s]',
                  policyname, permissive, cmd, roles,
                  coalesce(qual, '-'), coalesce(with_check, '-')),
           '; ' order by policyname)
    into v_others
    from pg_policies
   where schemaname = 'public' and tablename = 'bookmarks'
     and policyname not in ('bookmarks_select_own', 'bookmarks_insert_own',
                            'bookmarks_update_own', 'bookmarks_delete_own');
  if v_others is null then
    raise notice 'bookmarks: no other policies exist; only the four _own policies apply';
  else
    raise notice 'bookmarks: OTHER POLICIES TO REVIEW against the Gate A export: %', v_others;
    raise notice 'bookmarks: a permissive policy that is looser than auth.uid() = user_id still grants access in addition to these four: review and drop it by hand if so';
  end if;
end $$;

commit;
