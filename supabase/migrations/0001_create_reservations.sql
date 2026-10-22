create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  travel_date date not null,
  trip_type text not null
    check (trip_type in ('drop_off', 'pick_up', 'drop_and_pick', 'drop_and_wait')),
  depart_time time not null,
  arrive_time time not null,
  return_time time,
  requester_name text not null check (char_length(requester_name) between 2 and 120),
  department text check (char_length(department) <= 120),
  phone text not null check (phone ~ '^0[0-9]{8,9}$'),
  passengers integer not null check (passengers between 1 and 50),
  province text not null
    check (province in (
      'กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ',
      'สมุทรสาคร', 'นครปฐม', 'ฉะเชิงเทรา'
    )),
  destination text not null check (char_length(destination) between 2 and 200),
  note text check (char_length(note) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  check (arrive_time > depart_time),
  check (return_time is null or return_time > arrive_time)
);

create index reservations_phone_idx on public.reservations (phone);
create index reservations_travel_date_idx on public.reservations (travel_date);

alter table public.reservations enable row level security;

-- The public site may only submit new, pending requests. It cannot read the table.
create policy "Public can submit pending reservations"
  on public.reservations
  for insert
  to anon
  with check (status = 'pending');

-- Lookup by phone returns only non-personal columns for that phone number.
create function public.lookup_reservations(p_phone text)
returns table (
  code text,
  travel_date date,
  trip_type text,
  depart_time time,
  arrive_time time,
  return_time time,
  province text,
  destination text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code, r.travel_date, r.trip_type, r.depart_time, r.arrive_time,
         r.return_time, r.province, r.destination, r.status
  from public.reservations r
  where r.phone = p_phone
  order by r.travel_date desc, r.depart_time desc
  limit 50;
$$;

revoke execute on function public.lookup_reservations(text) from public, authenticated;
grant execute on function public.lookup_reservations(text) to anon;
