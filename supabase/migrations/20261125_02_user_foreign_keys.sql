-- Purpose: when a user is deleted from auth.users, their rows in public.complaints
-- and public.bookmarks are deleted with them (ON DELETE CASCADE), and new bookmark
-- rows must name an existing owner.
--   V-096 (decision P4): complaints.user_id FK changes from NO ACTION to ON DELETE CASCADE.
--   V-097 (decision P5): bookmarks.user_id gets an FK to auth.users(id) with ON DELETE
--     CASCADE, the default auth.uid(), and NOT NULL. The FK is added NOT VALID and is
--     only validated, and the column only set NOT NULL, when no existing row breaks it.
--   V-020: this file must be applied before the account-deleted webhook migration.
--
-- Apply by hand in the Supabase SQL editor. Idempotent (running it twice changes
-- nothing). Never destructive: no row is deleted, no table or column is dropped. The
-- only DROP is the old complaints FK, replaced by its cascade version in the same
-- transaction.
--
-- Apply order (Gate C): C2. After Gate A, and BEFORE
-- 20261125_03_account_deleted_webhook_vault.sql (C3).
--
-- Read the NOTICE lines in the editor's output: each one says what was done or
-- skipped. A notice that says "ask the owner" means some rows were left as they are
-- and need a decision; this file never changes or removes them.

begin;

-- complaints.user_id: NO ACTION -> ON DELETE CASCADE (V-096, P4).
-- The old FK is dropped and the new one added in the same transaction, so the column
-- is never without a foreign key.
do $$
declare
  v_old text;
begin
  select conname into v_old from pg_constraint
   where conrelid = 'public.complaints'::regclass and contype = 'f'
     and confrelid = 'auth.users'::regclass and confdeltype <> 'c';
  if v_old is not null then
    execute format('alter table public.complaints drop constraint %I', v_old);
    alter table public.complaints add constraint complaints_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
    raise notice 'complaints.user_id: replaced FK % with complaints_user_id_fkey ON DELETE CASCADE', v_old;
  else
    raise notice 'complaints.user_id already cascades: nothing to replace';
  end if;

  -- Validate only when every existing row has an owner in auth.users, so this
  -- statement cannot fail on live data. Also covers a second run after a skip.
  if exists (select 1 from pg_constraint
              where conrelid = 'public.complaints'::regclass
                and conname = 'complaints_user_id_fkey' and not convalidated) then
    if exists (select 1 from public.complaints c where c.user_id is not null
               and not exists (select 1 from auth.users u where u.id = c.user_id)) then
      raise notice 'complaints has rows whose owner no longer exists: FK left NOT VALID (new rows are checked); ask the owner';
    else
      alter table public.complaints validate constraint complaints_user_id_fkey;
      raise notice 'complaints.user_id: complaints_user_id_fkey validated';
    end if;
  end if;
end $$;

-- bookmarks.user_id: FK with cascade, owner default (V-097, P5).
-- Validated / NOT NULL only when no row breaks it.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.bookmarks'::regclass and conname = 'bookmarks_user_id_fkey') then
    alter table public.bookmarks add constraint bookmarks_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
    raise notice 'bookmarks.user_id: added bookmarks_user_id_fkey ON DELETE CASCADE (NOT VALID until checked below)';
  else
    raise notice 'bookmarks.user_id: bookmarks_user_id_fkey already exists: not added again';
  end if;

  -- The default only applies to an insert that leaves user_id out. The app always
  -- sends user_id, so its inserts are unchanged.
  alter table public.bookmarks alter column user_id set default auth.uid();
  raise notice 'bookmarks.user_id: default set to auth.uid()';

  if exists (select 1 from public.bookmarks b where b.user_id is not null
             and not exists (select 1 from auth.users u where u.id = b.user_id)) then
    raise notice 'bookmarks has rows whose owner no longer exists: FK left NOT VALID (new rows are checked); ask the owner';
  else
    alter table public.bookmarks validate constraint bookmarks_user_id_fkey;
    raise notice 'bookmarks.user_id: bookmarks_user_id_fkey validated';
  end if;

  if exists (select 1 from public.bookmarks where user_id is null) then
    raise notice 'bookmarks has rows with no owner: user_id left nullable; ask the owner';
  else
    alter table public.bookmarks alter column user_id set not null;
    raise notice 'bookmarks.user_id: set NOT NULL';
  end if;
end $$;

commit;
