-- Reservations made while signed in belong to that account. Older rows, made
-- before accounts existed, keep a null owner.
alter table public.reservations
  add column user_id uuid references auth.users on delete set null;

create index reservations_user_id_idx on public.reservations (user_id);

create policy "Users can submit own pending reservations"
  on public.reservations
  for insert
  to authenticated
  with check (status = 'pending' and user_id = (select auth.uid()));

create policy "Users can read own reservations"
  on public.reservations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Cancelling is the only change a user may make to a reservation, so it is a
-- function rather than an update policy. Returns whether a row was cancelled.
create function public.cancel_my_reservation(p_code text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with cancelled as (
    update public.reservations
    set status = 'cancelled'
    where code = p_code
      and user_id = (select auth.uid())
      and status in ('pending', 'approved')
    returning 1
  )
  select exists (select 1 from cancelled);
$$;

revoke execute on function public.cancel_my_reservation(text) from public, anon;
grant execute on function public.cancel_my_reservation(text) to authenticated;
