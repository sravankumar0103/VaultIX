-- What this file did on 1 Apr 2026: it created the notify_vaultix_account_deleted()
-- function and a trigger on auth.users so admin-side account deletions sent a
-- deletion email through the app's account-deleted route.
--
-- The function body held a secret and a hard-coded host. Both were removed from
-- this file on purpose. 20261125_03_account_deleted_webhook_vault.sql replaces the
-- function and the trigger.
--
-- Never paste a secret into any SQL file.

create extension if not exists pg_net with schema extensions;
