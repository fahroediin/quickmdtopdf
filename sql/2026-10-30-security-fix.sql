-- QuickMDtoPDF database setup + security fix: admin RPC + activity_logs RLS
-- Run once in Supabase Dashboard > SQL Editor. Safe to re-run.
-- Replaces the older setup script that used to be shown on the /admin page.
--
-- Fixes:
--   1. get_admin_users_list() ran as SECURITY DEFINER with no admin check,
--      so anyone holding the public anon key could list every user's email.
--   2. activity_logs let any authenticated user read every row, and let
--      anyone insert rows with a spoofed user_id / user_email.
--
-- Admin identity is stored by user id, not email. Matching on the email in
-- the JWT would let someone register the (public) admin address first if
-- email confirmation is ever turned off.
--
-- Requires the app server to have SUPABASE_SERVICE_ROLE_KEY set: PDF usage
-- logs are written by /api/generate-pdf through service_role.

begin;

-- 0. activity_logs table ------------------------------------------------------

create table if not exists public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  action text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

create index if not exists idx_activity_logs_created_at on public.activity_logs (created_at desc);
create index if not exists idx_activity_logs_action on public.activity_logs (action);
create index if not exists idx_activity_logs_user_id on public.activity_logs (user_id);

-- 1. Admin registry -----------------------------------------------------------

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on with no policies: only SECURITY DEFINER functions below can read it.
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

-- Seed from PUBLIC_ADMIN_EMAIL. The account must already exist in auth.users.
insert into public.app_admins (user_id)
select id from auth.users
where lower(email) in ('imam.fahrudin.work@gmail.com')
on conflict (user_id) do nothing;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = auth.uid()
  );
$$;

revoke execute on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- 2. Admin users list: same output, now gated --------------------------------

create or replace function public.get_admin_users_list()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  documents_count bigint,
  pdf_exports_count bigint,
  api_keys_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    coalesce(d.doc_count, 0)::bigint,
    coalesce(p.log_count, 0)::bigint,
    coalesce(a.key_count, 0)::bigint
  from auth.users u
  left join (
    select user_id, count(*) as doc_count
    from public.documents
    group by user_id
  ) d on d.user_id = u.id
  left join (
    select user_id, count(*) as log_count
    from public.activity_logs
    where action = 'generate_pdf'
    group by user_id
  ) p on p.user_id = u.id
  left join (
    select user_id, count(*) as key_count
    from public.api_keys
    group by user_id
  ) a on a.user_id = u.id
  order by u.created_at desc;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default; Supabase also grants anon.
revoke execute on function public.get_admin_users_list() from public, anon;
grant execute on function public.get_admin_users_list() to authenticated;

-- 3. activity_logs policies ---------------------------------------------------

alter table public.activity_logs enable row level security;

drop policy if exists "Enable insert for activity_logs" on public.activity_logs;
drop policy if exists "Enable select for authenticated users" on public.activity_logs;
drop policy if exists "activity_logs insert own" on public.activity_logs;
drop policy if exists "activity_logs insert server anon" on public.activity_logs;
drop policy if exists "activity_logs select own or admin" on public.activity_logs;

-- Signed-in users may only log events as themselves.
create policy "activity_logs insert own"
on public.activity_logs for insert to authenticated
with check (
  user_id = auth.uid()
  and (user_email is null or lower(user_email) = lower(auth.jwt() ->> 'email'))
);

-- No insert policy for anon: generate_pdf rows come from the server through
-- service_role (bypasses RLS), user_register rows from the trigger below.

-- Users read their own rows; admins read everything (used by /api/admin/logs).
create policy "activity_logs select own or admin"
on public.activity_logs for select to authenticated
using (user_id = auth.uid() or public.is_app_admin());

-- 4. Log sign-ups in the database --------------------------------------------
-- signUp() often returns no session (email confirmation), so the browser
-- cannot log the event as the new user. A trigger cannot be spoofed.

create or replace function public.log_user_register()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.activity_logs (user_id, user_email, action, details)
    values (new.id, new.email, 'user_register', jsonb_build_object('email', new.email));
  exception when others then
    -- Never block a sign-up because logging failed.
    raise warning 'log_user_register failed: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke execute on function public.log_user_register() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_log on auth.users;
create trigger on_auth_user_created_log
after insert on auth.users
for each row execute function public.log_user_register();

commit;

-- 5. Checks (run after commit) -------------------------------------------------

-- Expect exactly one row: your admin account.
-- select a.user_id, u.email from public.app_admins a join auth.users u on u.id = a.user_id;

-- Expect anon = false, authenticated = true.
-- select has_function_privilege('anon', 'public.get_admin_users_list()', 'execute') as anon,
--        has_function_privilege('authenticated', 'public.get_admin_users_list()', 'execute') as authenticated;

-- Review documents / api_keys policies: each should restrict to user_id = auth.uid().
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies where schemaname = 'public'
--   and tablename in ('documents', 'api_keys', 'pdf_usage_logs', 'activity_logs')
-- order by tablename, cmd;
