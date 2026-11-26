-- Purpose: constraints, indexes, search path, policies and complaints hardening for
-- public.bookmarks, public.complaints and the media storage bucket.
--   Parts: 1 created_at, 2 bookmarks checks, 3 complaints checks and grants, 4 search
--     path, 5 indexes, 6 bookmarks policy text, 7 visit_count comment, 8 storage DELETE
--     policy for the media bucket, 9 media_url default.
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
--   Part 6 (owner decision 8, 26 Nov 2026): the four live bookmarks policies are rewritten
--     from "user_id = auth.uid()" to "(select auth.uid()) = user_id" (same meaning,
--     evaluated once per query). Each is changed only if it exists under its exact name.
--   Part 8 (owner decision 4, 26 Nov 2026): storage.objects had no DELETE policy, so the
--     browser could never remove a file from the media bucket. This adds an owner-scoped
--     one ("Users can delete their own media"), created only if no policy of that name
--     exists. Files whose owner columns are both empty cannot be deleted from the
--     browser; a notice and a summary row give their count.
--   Part 9 (owner decision 7, 26 Nov 2026): the typo default 'nullable' on
--     bookmarks.media_url is removed (default becomes NULL). Rows that already hold the
--     text 'nullable' are only counted, never changed: the owner decides.
--
-- APPLY ORDER (Gate C): C4, the LAST file, and only AFTER this branch is deployed to
-- production. The old client inserted into complaints directly with status and
-- user_email; once this file runs, that insert is refused. The deployed branch sends
-- feedback through POST /api/send-email instead, which is not affected.
--
-- Apply by hand in the Supabase SQL editor. Idempotent: running it twice changes
-- nothing. Never deletes rows. The only thing dropped is the 'nullable' default of
-- bookmarks.media_url (part 9); no policy is dropped. The only data write is part 1's
-- fill of null bookmarks.created_at values.
--
-- Read the NOTICE lines in the editor's output: each one says what was done or
-- skipped. A notice that says "ask the owner" means some rows were left as they are
-- and need a decision; this file never changes or removes them. The editor may not
-- show notices, so the file ends with one read-only summary query: check its
-- "actual" column against "expected".

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
-- A NOT VALID check is still enforced on every UPDATE of an existing row (whatever
-- column changes), so a breaking row cannot be edited or archived until it is fixed.
do $$
declare
  v_bad bigint;
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
    select count(*) into v_bad from public.bookmarks where priority not between 1 and 3;
    if v_bad > 0 then
      raise notice 'bookmarks has % row(s) with priority outside 1 to 3: bookmarks_priority_range left NOT VALID. New rows AND any update of those rows (even archiving) are refused until they are fixed; ask the owner', v_bad;
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
    select count(*) into v_bad from public.bookmarks where length(btrim(title)) = 0;
    if v_bad > 0 then
      raise notice 'bookmarks has % row(s) with a blank title: bookmarks_title_not_blank left NOT VALID. New rows AND any update of those rows (even archiving) are refused until they are fixed; ask the owner', v_bad;
    else
      alter table public.bookmarks validate constraint bookmarks_title_not_blank;
      raise notice 'bookmarks: bookmarks_title_not_blank validated';
    end if;
  end if;
end $$;

-- Part 3: complaints CHECK constraints and column-level INSERT grant (V-103, V-018, P7).
-- complaints.created_at already has a NOT NULL default (timezone('utc', now())), so it
-- is not touched here (ruling C-10). As in part 2, a NOT VALID check is also enforced
-- on every UPDATE of an existing row.
do $$
declare
  v_bad bigint;
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
    select count(*) into v_bad from public.complaints where char_length(subject) > 200;
    if v_bad > 0 then
      raise notice 'complaints has % row(s) with a subject over 200 characters: complaints_subject_length left NOT VALID. New rows AND any update of those rows are refused until they are fixed; ask the owner', v_bad;
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
    select count(*) into v_bad from public.complaints where char_length(body) > 5000;
    if v_bad > 0 then
      raise notice 'complaints has % row(s) with a body over 5000 characters: complaints_body_length left NOT VALID. New rows AND any update of those rows are refused until they are fixed; ask the owner', v_bad;
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

  -- Only a valid, non-partial index counts as equivalent.
  if exists (select 1 from pg_index
              where indrelid = 'public.bookmarks'::regclass
                and indkey[0] = v_user and indkey[1] = v_created
                and indisvalid and indpred is null) then
    raise notice 'bookmarks: a valid index on (user_id, created_at) already exists: not added';
  else
    create index if not exists bookmarks_user_id_created_at_idx
      on public.bookmarks (user_id, created_at desc);
    if exists (select 1 from pg_index
                where indexrelid = to_regclass('public.bookmarks_user_id_created_at_idx')
                  and indrelid = 'public.bookmarks'::regclass
                  and indkey[0] = v_user and indkey[1] = v_created) then
      raise notice 'bookmarks: index bookmarks_user_id_created_at_idx is in place';
    else
      raise notice 'bookmarks: bookmarks_user_id_created_at_idx exists but not on (user_id, created_at); ask the owner';
    end if;
  end if;

  select attnum into v_user from pg_attribute
   where attrelid = 'public.complaints'::regclass and attname = 'user_id';

  if exists (select 1 from pg_index
              where indrelid = 'public.complaints'::regclass and indkey[0] = v_user
                and indisvalid and indpred is null) then
    raise notice 'complaints: a valid index led by user_id already exists: not added';
  else
    create index if not exists complaints_user_id_idx on public.complaints (user_id);
    if exists (select 1 from pg_index
                where indexrelid = to_regclass('public.complaints_user_id_idx')
                  and indrelid = 'public.complaints'::regclass and indkey[0] = v_user) then
      raise notice 'complaints: index complaints_user_id_idx is in place';
    else
      raise notice 'complaints: complaints_user_id_idx exists but is not led by user_id; ask the owner';
    end if;
  end if;
end $$;

-- Part 6: bookmarks policy text (owner decision 8). The four live policies (Gate A export,
-- 26 Nov 2026) read "user_id = auth.uid()". Each is rewritten to the equivalent
-- "(select auth.uid()) = user_id", which Postgres evaluates once per query instead of once
-- per row. Same meaning: the same rows are visible and writable. A policy is changed only
-- when it exists under its exact name AND for the expected command; the roles of a policy
-- are not touched. No policy is dropped. Re-running rewrites the same text again.
do $$
declare
  v_p record;
  v_expr constant text := '(select auth.uid()) = user_id';
  v_other text;
begin
  for v_p in
    select * from (values
      ('Users can view their own bookmarks', 'SELECT'),
      ('Users can insert their own bookmarks', 'INSERT'),
      ('Users can update their own bookmarks', 'UPDATE'),
      ('Users can delete their own bookmarks', 'DELETE')
    ) as t(policyname, cmd)
  loop
    if exists (select 1 from pg_policies pp
                where pp.schemaname = 'public' and pp.tablename = 'bookmarks'
                  and pp.policyname = v_p.policyname and pp.cmd = v_p.cmd) then
      if v_p.cmd = 'INSERT' then
        execute format('alter policy %I on public.bookmarks with check (%s)', v_p.policyname, v_expr);
      elsif v_p.cmd = 'UPDATE' then
        execute format('alter policy %I on public.bookmarks using (%s) with check (%s)', v_p.policyname, v_expr, v_expr);
      else
        execute format('alter policy %I on public.bookmarks using (%s)', v_p.policyname, v_expr);
      end if;
      raise notice 'bookmarks: policy "%" (%) now reads %', v_p.policyname, v_p.cmd, v_expr;
    else
      raise notice 'bookmarks: policy "%" not found as a % policy: not changed', v_p.policyname, v_p.cmd;
    end if;
  end loop;

  -- A loose permissive policy would still grant access next to these four.
  select string_agg(pp.policyname, ', ' order by pp.policyname) into v_other
    from pg_policies pp
   where pp.schemaname = 'public' and pp.tablename = 'bookmarks'
     and pp.policyname not in ('Users can view their own bookmarks', 'Users can insert their own bookmarks',
                               'Users can update their own bookmarks', 'Users can delete their own bookmarks');
  if v_other is null then
    raise notice 'bookmarks: no other policies exist';
  else
    raise notice 'bookmarks: OTHER policies exist (%): review them, a permissive one grants access on top of the four; ask the owner', v_other;
  end if;
end $$;

-- Part 7: document the unused visit_count column (V-100, P6). Kept on purpose.
comment on column public.bookmarks.visit_count is
  'Unused by the app (audit V-100, 25 Nov 2026). Kept on purpose: never drop without the owner.';

-- Part 8: storage DELETE policy for the media bucket (owner decision 4, V-036).
-- Live there is only an INSERT and a SELECT policy on storage.objects, so deleting a
-- bookmark never removed its file from the browser. The new policy lets a signed-in user
-- delete only objects of the media bucket that they own. Current Supabase stores the
-- owner in storage.objects.owner_id (text); the older owner column (uuid) is deprecated
-- but old rows may only have that one, so the policy accepts either, using whichever
-- columns exist. It is created only if no policy of that exact name exists, and nothing
-- is dropped. If the SQL editor role may not create policies on storage.objects, a
-- notice says so and the rest of this file still applies (create the policy in the
-- dashboard under Storage, Policies instead).
do $$
declare
  v_has_owner_id boolean;
  v_has_owner boolean;
  v_check text;
  v_ownerless bigint;
begin
  select exists (select 1 from pg_attribute
                  where attrelid = 'storage.objects'::regclass and attname = 'owner_id' and not attisdropped)
    into v_has_owner_id;
  select exists (select 1 from pg_attribute
                  where attrelid = 'storage.objects'::regclass and attname = 'owner' and not attisdropped)
    into v_has_owner;

  if v_has_owner_id then
    v_check := 'owner_id = (select auth.uid())::text';
  end if;
  if v_has_owner then
    v_check := case when v_check is null then 'owner = (select auth.uid())'
                    else v_check || ' or owner = (select auth.uid())' end;
  end if;

  if exists (select 1 from pg_policies pp
              where pp.schemaname = 'storage' and pp.tablename = 'objects'
                and pp.policyname = 'Users can delete their own media') then
    raise notice 'storage.objects: policy "Users can delete their own media" already exists: not created again';
  elsif v_check is null then
    raise notice 'storage.objects has neither owner_id nor owner: policy not created; ask the owner';
  else
    begin
      execute 'create policy "Users can delete their own media" on storage.objects for delete to authenticated using (bucket_id = ''media'' and (' || v_check || '))';
      raise notice 'storage.objects: created policy "Users can delete their own media" (owner check: %)', v_check;
    exception when insufficient_privilege then
      raise notice 'storage.objects: this role may not create policies there: create "Users can delete their own media" in the dashboard (Storage, Policies); ask the owner';
    end;
  end if;

  -- Read-only: media files with no owner at all cannot be matched by the policy.
  select count(*) into v_ownerless from storage.objects o
   where o.bucket_id = 'media'
     and to_jsonb(o) ->> 'owner_id' is null and to_jsonb(o) ->> 'owner' is null;
  if v_ownerless > 0 then
    raise notice 'storage.objects: % file(s) in media have no owner set: the browser cannot delete them; delete them in the dashboard (Storage, media); ask the owner', v_ownerless;
  else
    raise notice 'storage.objects: every file in media has an owner set';
  end if;
end $$;

-- Part 9: remove the typo default of bookmarks.media_url (owner decision 7).
-- The live default is the text 'nullable' (Gate A export). It is dropped only when the
-- default is exactly that; any other default is left alone. Rows that already hold the
-- text 'nullable' are counted and NOT changed: the owner decides what to do with them.
do $$
declare
  v_default text;
  v_rows bigint;
begin
  select pg_get_expr(d.adbin, d.adrelid) into v_default
    from pg_attrdef d
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
   where d.adrelid = 'public.bookmarks'::regclass and a.attname = 'media_url';

  if v_default is null then
    raise notice 'bookmarks.media_url has no default: not changed';
  elsif v_default = '''nullable''::text' then
    alter table public.bookmarks alter column media_url drop default;
    raise notice 'bookmarks.media_url: removed the default ''nullable''';
  else
    raise notice 'bookmarks.media_url default is %, not the known typo: not changed; ask the owner', v_default;
  end if;

  select count(*) into v_rows from public.bookmarks where media_url = 'nullable';
  if v_rows > 0 then
    raise notice 'bookmarks: % row(s) hold the text ''nullable'' in media_url: left as they are; ask the owner', v_rows;
  else
    raise notice 'bookmarks: no row holds the text ''nullable'' in media_url';
  end if;
end $$;

commit;

-- Read-only summary. The SQL editor may hide NOTICE lines and shows only the last
-- result set, so this one query reports everything that matters. Compare "actual"
-- with "expected" on each row. A constraint row showing false means that check was
-- left NOT VALID (rows break it): ask the owner. The privilege rows matter most: a
-- REVOKE or GRANT run by a role that is not the grantor only warns and does nothing.
select item, actual, expected
  from (values
    (1, 'bookmarks_priority_range validated',
        coalesce((select convalidated::text from pg_catalog.pg_constraint
                   where conrelid = 'public.bookmarks'::regclass and conname = 'bookmarks_priority_range'), 'missing'),
        'true'),
    (2, 'bookmarks_title_not_blank validated',
        coalesce((select convalidated::text from pg_catalog.pg_constraint
                   where conrelid = 'public.bookmarks'::regclass and conname = 'bookmarks_title_not_blank'), 'missing'),
        'true'),
    (3, 'complaints_subject_length validated',
        coalesce((select convalidated::text from pg_catalog.pg_constraint
                   where conrelid = 'public.complaints'::regclass and conname = 'complaints_subject_length'), 'missing'),
        'true'),
    (4, 'complaints_body_length validated',
        coalesce((select convalidated::text from pg_catalog.pg_constraint
                   where conrelid = 'public.complaints'::regclass and conname = 'complaints_body_length'), 'missing'),
        'true'),
    (5, 'bookmarks.created_at NOT NULL',
        (select attnotnull::text from pg_catalog.pg_attribute
          where attrelid = 'public.bookmarks'::regclass and attname = 'created_at'),
        'true'),
    (6, 'bookmarks indexes',
        (select string_agg(indexname::text, ', ' order by indexname) from pg_catalog.pg_indexes
          where schemaname = 'public' and tablename = 'bookmarks'),
        'includes bookmarks_user_id_created_at_idx (or a notice named an equivalent)'),
    (7, 'complaints indexes',
        (select string_agg(indexname::text, ', ' order by indexname) from pg_catalog.pg_indexes
          where schemaname = 'public' and tablename = 'complaints'),
        'includes complaints_user_id_idx (or a notice named an equivalent)'),
    (8, 'update_updated_at proconfig',
        coalesce((select array_to_string(proconfig, ',') from pg_catalog.pg_proc
                   where oid = to_regprocedure('public.update_updated_at()')), 'none'),
        'search_path=""'),
    (9, 'visit_count comment set',
        (select (col_description('public.bookmarks'::regclass, attnum) is not null)::text
           from pg_catalog.pg_attribute
          where attrelid = 'public.bookmarks'::regclass and attname = 'visit_count'),
        'true'),
    (10, 'anon INSERT on complaints (table)',
        has_table_privilege('anon', 'public.complaints', 'INSERT')::text, 'false'),
    (11, 'anon INSERT on any complaints column',
        has_any_column_privilege('anon', 'public.complaints', 'INSERT')::text, 'false'),
    (12, 'authenticated INSERT on complaints (table)',
        has_table_privilege('authenticated', 'public.complaints', 'INSERT')::text, 'false'),
    (13, 'authenticated INSERT on complaints.status',
        has_column_privilege('authenticated', 'public.complaints', 'status', 'INSERT')::text, 'false'),
    (14, 'authenticated INSERT on complaints.user_email',
        has_column_privilege('authenticated', 'public.complaints', 'user_email', 'INSERT')::text, 'false'),
    (15, 'authenticated INSERT on complaints.subject',
        has_column_privilege('authenticated', 'public.complaints', 'subject', 'INSERT')::text, 'true'),
    (16, 'service_role INSERT on complaints (table)',
        has_table_privilege('service_role', 'public.complaints', 'INSERT')::text, 'true'),
    (17, 'storage policy "Users can delete their own media" exists',
        (exists (select 1 from pg_catalog.pg_policies
                  where schemaname = 'storage' and tablename = 'objects'
                    and policyname = 'Users can delete their own media' and cmd = 'DELETE'))::text,
        'true'),
    (18, 'storage delete policy text',
        coalesce((select roles::text || ' ' || qual from pg_catalog.pg_policies
                   where schemaname = 'storage' and tablename = 'objects'
                     and policyname = 'Users can delete their own media'), 'missing'),
        'roles {authenticated}; bucket_id = media AND owner_id and/or owner compared with a sub-select of auth.uid()'),
    (19, 'media files with no owner set',
        (select count(*)::text from storage.objects o
          where o.bucket_id = 'media'
            and to_jsonb(o) ->> 'owner_id' is null and to_jsonb(o) ->> 'owner' is null),
        '0 (more: those files can only be deleted in the dashboard)'),
    (20, 'bookmarks.media_url default',
        coalesce((select pg_get_expr(d.adbin, d.adrelid) from pg_catalog.pg_attrdef d
                    join pg_catalog.pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
                   where d.adrelid = 'public.bookmarks'::regclass and a.attname = 'media_url'), 'null'),
        'null (no default)'),
    (21, 'bookmarks rows whose media_url is the text nullable',
        (select count(*)::text from public.bookmarks where media_url = 'nullable'),
        '0 (more: left as they are, ask the owner)'),
    (22, 'bookmarks SELECT policy text',
        coalesce((select qual from pg_catalog.pg_policies
                   where schemaname = 'public' and tablename = 'bookmarks'
                     and policyname = 'Users can view their own bookmarks'), 'missing'),
        'a sub-select form: ((SELECT auth.uid() AS uid) = user_id)'),
    (23, 'bookmarks INSERT policy with check',
        coalesce((select with_check from pg_catalog.pg_policies
                   where schemaname = 'public' and tablename = 'bookmarks'
                     and policyname = 'Users can insert their own bookmarks'), 'missing'),
        'a sub-select form: ((SELECT auth.uid() AS uid) = user_id)'),
    (24, 'bookmarks UPDATE policy using / with check',
        coalesce((select qual || ' / ' || with_check from pg_catalog.pg_policies
                   where schemaname = 'public' and tablename = 'bookmarks'
                     and policyname = 'Users can update their own bookmarks'), 'missing'),
        'both a sub-select form: ((SELECT auth.uid() AS uid) = user_id)'),
    (25, 'bookmarks DELETE policy text',
        coalesce((select qual from pg_catalog.pg_policies
                   where schemaname = 'public' and tablename = 'bookmarks'
                     and policyname = 'Users can delete their own bookmarks'), 'missing'),
        'a sub-select form: ((SELECT auth.uid() AS uid) = user_id)')
  ) as summary(n, item, actual, expected)
 order by n;
