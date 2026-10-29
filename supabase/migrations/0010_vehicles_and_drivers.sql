-- The cars and drivers an admin assigns when approving a booking. Admins
-- manage both lists on the settings page; a car or driver no longer in use is
-- deactivated rather than deleted once bookings point at it, so past bookings
-- keep showing who drove what.
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique check (char_length(btrim(plate)) between 2 and 30),
  description text check (char_length(description) <= 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 2 and 120),
  phone text check (phone ~ '^0[0-9]{8,9}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;

create policy "Admins can manage vehicles"
  on public.vehicles
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can manage drivers"
  on public.drivers
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Set when a booking is approved and cleared when it is rejected. A car or
-- driver a booking points at cannot be deleted.
alter table public.reservations
  add column vehicle_id uuid references public.vehicles on delete restrict,
  add column driver_id uuid references public.drivers on delete restrict;

create index reservations_vehicle_id_idx on public.reservations (vehicle_id);
create index reservations_driver_id_idx on public.reservations (driver_id);

-- Approving now needs an active car and driver. Approving an approved booking
-- again changes its car or driver.
drop function public.set_reservation_status(text, text, text);
drop function public.set_reservation_statuses(text[], text, text);

create function public.set_reservation_statuses(
  p_codes text[],
  p_status text,
  p_reason text default null,
  p_vehicle_id uuid default null,
  p_driver_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  if p_status = 'rejected' and coalesce(btrim(p_reason), '') = '' then
    raise exception 'a rejection needs a reason' using errcode = '22023';
  end if;
  if p_status = 'approved' and (
    not exists (select 1 from public.vehicles where id = p_vehicle_id and active)
    or not exists (select 1 from public.drivers where id = p_driver_id and active)
  ) then
    raise exception 'an approval needs an active vehicle and driver'
      using errcode = '22023';
  end if;

  update public.reservations
  set status = p_status,
      reject_reason = case when p_status = 'rejected' then btrim(p_reason) end,
      vehicle_id = case when p_status = 'approved' then p_vehicle_id end,
      driver_id = case when p_status = 'approved' then p_driver_id end
  where code = any (p_codes)
    and status in ('pending', 'approved', 'rejected')
    and (
      status <> p_status
      or (p_status = 'approved' and (
        vehicle_id is distinct from p_vehicle_id
        or driver_id is distinct from p_driver_id
      ))
    );
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke execute on function public.set_reservation_statuses(text[], text, text, uuid, uuid) from public, anon;
grant execute on function public.set_reservation_statuses(text[], text, text, uuid, uuid) to authenticated;

-- One booking, under the same rules. Returns whether it changed.
create function public.set_reservation_status(
  p_code text,
  p_status text,
  p_reason text default null,
  p_vehicle_id uuid default null,
  p_driver_id uuid default null
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.set_reservation_statuses(
    array[p_code], p_status, p_reason, p_vehicle_id, p_driver_id
  ) > 0;
$$;

revoke execute on function public.set_reservation_status(text, text, text, uuid, uuid) from public, anon;
grant execute on function public.set_reservation_status(text, text, text, uuid, uuid) to authenticated;
