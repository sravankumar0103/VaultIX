-- Purpose: constraints, indexes, search path and complaints hardening for
-- public.bookmarks and public.complaints.
--   V-099 (decision P5): bookmarks.created_at gets a default, its null rows are filled
--     from updated_at (or now()), then it is set NOT NULL.
--   V-103 (decision P5): CHECK constraints on bookmarks.priority (1 to 3), bookmarks.title
--     (not blank) and complaints.subject / complaints.body lengths (200 / 5000, the same
--     limits POST /api/send-email enforces). Each is added NOT VALID and only validated
--     when no existing row breaks it, so this file never fails on live data.
--   V-018 (decision P7): the browser no longer inserts into public.complaints (the app
--     inserts server-side through POST /api/send-email with the service role). The
--     anon / authenticated roles lose INSERT on the table and authenticated gets INSERT
--     back on (user_id, subject, body) only, so a direct anon-key insert can no longer
--     set status or user_email. The RLS INSERT policy is kept unchanged.
--   V-101: public.update_updated_at() gets a pinned search_path.
--   Indexes for the queries the app runs: bookmarks by owner newest first, complaints by
--     owner (the hourly feedback limit and the account-deletion cleanup).
--   V-100 (decision P6): bookmarks.visit_count is unused but KEPT and documented.
--
-- APPLY ORDER (Gate C): C4, the LAST file, and only AFTER this branch is deployed to
-- production. The old client inserted into complaints directly with status and
-- user_email; once this file runs, that insert is refused. The deployed branch sends
-- feedback through POST /api/send-email instead, which is not affected.
--
-- Apply by hand in the Supabase SQL editor. Idempotent: running it twice changes
-- nothing. Never destructive: nothing is dropped, deleted or truncated. The only data
-- write is part 1's fill of null bookmarks.created_at values.
--
-- Read the NOTICE lines in the editor's output: each one says what was done or
-- skipped. A notice that says "ask the owner" means some rows were left as they are
-- and need a decision; this file never changes or removes them.

begin;

-- Part 1: bookmarks.created_at default, null fill, NOT NULL (V-099, P5).
do $$
declare
  v_trigger record;
  v_disabled text[] := '{}';
  v_filled bigint;
begin
  if exists (select 1 from pg_attribute
              where attrelid = 'public.bookmarks'::regclass and attname = 'created_at'
                and not atthasdef) then
    alter table public.bookmarks alter column created_at set default now();
    raise notice 'bookmarks.created_at: default set to now()';
  else
    raise notice 'bookmarks.created_at already has a default: not changed';
  end if;

  if exists (select 1 from public.bookmarks where created_at is null) then
    -- The updated_at trigger would stamp now() on every filled row, so the triggers
    -- that call update_updated_at() are paused for this one statement and turned back
    -- on right after (same transaction: an error rolls all of it back).
    for v_trigger in
      select t.tgname from pg_trigger t join pg_proc p on p.oid = t.tgfoid
       where t.tgrelid = 'public.bookmarks'::regclass and not t.tgisinternal
         and p.proname = 'update_updated_at' and t.tgenabled <> 'D'
    loop
      execute format('alter table public.bookmarks disable trigger %I', v_trigger.tgname);
      v_disabled := v_disabled || v_trigger.tgname::text;
    end loop;

    update public.bookmarks set created_at = coalesce(updated_at, now())
     where created_at is null;
    get diagnostics v_filled = row_count;

    for i in 1 .. coalesce(array_length(v_disabled, 1), 0) loop
      execute format('alter table public.bookmarks enable trigger %I', v_disabled[i]);
    end loop;
    raise notice 'bookmarks.created_at: filled % null row(s) from updated_at or now()', v_filled;
  else
    raise notice 'bookmarks.created_at: no null rows to fill';
  end if;

  if exists (select 1 from pg_attribute
              where attrelid = 'public.bookmarks'::regclass and attname = 'created_at'
                and not attnotnull) then
    alter table public.bookmarks alter column created_at set not null;
    raise notice 'bookmarks.created_at: set NOT NULL';
  else
    raise notice 'bookmarks.created_at is already NOT NULL';
  end if;
end $$;

-- Part 2: bookmarks CHECK constraints (V-103, P5). Added only if absent; validated
-- only when no row breaks them. A null priority passes the check (as it does today).
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.bookmarks'::regclass and conname = 'bookmarks_priority_range') then
    alter table public.bookmarks add constraint bookmarks_priority_range
      check (priority between 1 and 3) not valid;
    raise notice 'bookmarks: added bookmarks_priority_range (NOT VALID until checked below)';
  else
    raise notice 'bookmarks: bookmarks_priority_range already exists: not added again';
  end if;

  if exists (select 1 from pg_constraint
              where conrelid = 'public.bookmarks'::regclass
                and conname = 'bookmarks_priority_range' and not convalidated) then
    if exists (select 1 from public.bookmarks where priority not between 1 and 3) then
      raise notice 'bookmarks has rows with priority outside 1 to 3: bookmarks_priority_range left NOT VALID (new rows are checked); ask the owner';
    else
      alter table public.bookmarks validate constraint bookmarks_priority_range;
      raise notice 'bookmarks: bookmarks_priority_range validated';
    end if;
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.bookmarks'::regclass and conname = 'bookmarks_title_not_blank') then
    alter table public.bookmarks add constraint bookmarks_title_not_blank
      check (length(btrim(title)) > 0) not valid;
    raise notice 'bookmarks: added bookmarks_title_not_blank (NOT VALID until checked below)';
  else
    raise notice 'bookmarks: bookmarks_title_not_blank already exists: not added again';
  end if;

  if exists (select 1 from pg_constraint
              where conrelid = 'public.bookmarks'::regclass
                and conname = 'bookmarks_title_not_blank' and not convalidated) then
    if exists (select 1 from public.bookmarks where length(btrim(title)) = 0) then
      raise notice 'bookmarks has rows with a blank title: bookmarks_title_not_blank left NOT VALID (new rows are checked); ask the owner';
    else
      alter table public.bookmarks validate constraint bookmarks_title_not_blank;
      raise notice 'bookmarks: bookmarks_title_not_blank validated';
    end if;
  end if;
end $$;

-- Part 3: complaints CHECK constraints and column-level INSERT grant (V-103, V-018, P7).
-- complaints.created_at already has a NOT NULL default (timezone('utc', now())), so it
-- is not touched here (ruling C-10).
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.complaints'::regclass and conname = 'complaints_subject_length') then
    alter table public.complaints add constraint complaints_subject_length
      check (char_length(subject) <= 200) not valid;
    raise notice 'complaints: added complaints_subject_length (NOT VALID until checked below)';
  else
    raise notice 'complaints: complaints_subject_length already exists: not added again';
  end if;

  if exists (select 1 from pg_constraint
              where conrelid = 'public.complaints'::regclass
                and conname = 'complaints_subject_length' and not convalidated) then
    if exists (select 1 from public.complaints where char_length(subject) > 200) then
      raise notice 'complaints has rows with a subject over 200 characters: complaints_subject_length left NOT VALID (new rows are checked); ask the owner';
    else
      alter table public.complaints validate constraint complaints_subject_length;
      raise notice 'complaints: complaints_subject_length validated';
    end if;
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.complaints'::regclass and conname = 'complaints_body_length') then
    alter table public.complaints add constraint complaints_body_length
      check (char_length(body) <= 5000) not valid;
    raise notice 'complaints: added complaints_body_length (NOT VALID until checked below)';
  else
    raise notice 'complaints: complaints_body_length already exists: not added again';
  end if;

  if exists (select 1 from pg_constraint
              where conrelid = 'public.complaints'::regclass
                and conname = 'complaints_body_length' and not convalidated) then
    if exists (select 1 from public.complaints where char_length(body) > 5000) then
      raise notice 'complaints has rows with a body over 5000 characters: complaints_body_length left NOT VALID (new rows are checked); ask the owner';
    else
      alter table public.complaints validate constraint complaints_body_length;
      raise notice 'complaints: complaints_body_length validated';
    end if;
  end if;

  -- Revoking the table-level INSERT also revokes any column-level INSERT grants of these
  -- roles, so the grant below is the only INSERT they keep. service_role is not touched.
  -- Running this twice ends in the same privileges.
  revoke insert on table public.complaints from anon, authenticated;
  grant insert (user_id, subject, body) on table public.complaints to authenticated;
  raise notice 'complaints: INSERT revoked from anon and authenticated; authenticated may insert (user_id, subject, body) only';
end $$;

-- Part 4: pin the search_path of update_updated_at() (V-101).
-- The live body is "NEW.updated_at = now(); RETURN NEW;" (owner's SQL history), which
-- uses only pg_catalog, and pg_catalog is always searched, so an empty path is safe.
-- If the body found at apply time is different, pg_catalog, public is used instead so
-- any unqualified public name in it still resolves.
do $$
declare
  v_src text;
begin
  select p.prosrc into v_src from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname = 'update_updated_at'
     and p.pronargs = 0;
  if v_src is null then
    raise notice 'public.update_updated_at() not found: search_path not changed';
  elsif regexp_replace(lower(v_src), '\s+', '', 'g') = 'beginnew.updated_at=now();returnnew;end;' then
    alter function public.update_updated_at() set search_path = '';
    raise notice 'public.update_updated_at(): search_path set to empty (body uses only now())';
  else
    alter function public.update_updated_at() set search_path = pg_catalog, public;
    raise notice 'public.update_updated_at(): body differs from the known one, search_path set to pg_catalog, public; ask the owner to review the body';
  end if;
end $$;

-- Part 5: indexes. Skipped when an index with the same leading key columns already
-- exists under another name (an ascending index serves the descending scan too).
do $$
declare
  v_user smallint;
  v_created smallint;
begin
  select attnum into v_user from pg_attribute
   where attrelid = 'public.bookmarks'::regclass and attname = 'user_id';
  select attnum into v_created from pg_attribute
   where attrelid = 'public.bookmarks'::regclass and attname = 'created_at';

  if exists (select 1 from pg_index
              where indrelid = 'public.bookmarks'::regclass
                and indkey[0] = v_user and indkey[1] = v_created) then
    raise notice 'bookmarks: an index on (user_id, created_at) already exists: not added';
  else
    create index if not exists bookmarks_user_id_created_at_idx
      on public.bookmarks (user_id, created_at desc);
    raise notice 'bookmarks: index bookmarks_user_id_created_at_idx created';
  end if;

  select attnum into v_user from pg_attribute
   where attrelid = 'public.complaints'::regclass and attname = 'user_id';

  if exists (select 1 from pg_index
              where indrelid = 'public.complaints'::regclass and indkey[0] = v_user) then
    raise notice 'complaints: an index led by user_id already exists: not added';
  else
    create index if not exists complaints_user_id_idx on public.complaints (user_id);
    raise notice 'complaints: index complaints_user_id_idx created';
  end if;
end $$;

-- Part 6: SKIPPED, awaits the Gate A schema export.
-- Rewriting the existing bookmarks policies from "auth.uid() = user_id" to
-- "(select auth.uid()) = user_id" (same meaning, evaluated once per query) needs the
-- live policy names and texts, which only the Gate A export shows. No policy is
-- changed by this file.

-- Part 7: document the unused visit_count column (V-100, P6). Kept on purpose.
comment on column public.bookmarks.visit_count is
  'Unused by the app (audit V-100, 25 Nov 2026). Kept on purpose: never drop without the owner.';

-- Part 8: SKIPPED, awaits the Gate A schema export.
-- Owner-scoped replacements for any storage.objects UPDATE or DELETE policy on the
-- media bucket that lacks an owner check (V-036) need the live storage policy names
-- and texts, which only the Gate A export shows. No storage policy is changed by this
-- file.

do $$
begin
  raise notice 'parts 6 (bookmarks policy text) and 8 (media storage policies) skipped: they await the Gate A schema export';
end $$;

commit;
