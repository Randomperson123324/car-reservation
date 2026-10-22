-- Accounts allowed to approve and reject reservations. Granted by hand in the
-- SQL editor; there are no policies, so the API can neither read nor change
-- the table directly.
create table public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "Admins can read all reservations"
  on public.reservations
  for select
  to authenticated
  using ((select public.is_admin()));

-- Approving and rejecting is the only change an admin makes, so it is a
-- function rather than an update policy. A booking the user cancelled stays
-- cancelled. Returns whether a row was changed.
create function public.set_reservation_status(p_code text, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  update public.reservations
  set status = p_status
  where code = p_code
    and status in ('pending', 'approved', 'rejected')
    and status <> p_status;
  return found;
end;
$$;

revoke execute on function public.set_reservation_status(text, text) from public, anon;
grant execute on function public.set_reservation_status(text, text) to authenticated;
