-- The public lookups also return why a booking was rejected, so the requester
-- sees it when checking the status. The return type changes, so the functions
-- are dropped and made again.
drop function public.lookup_reservations(text);
drop function public.lookup_reservation_by_code(text);

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
  status text,
  reject_reason text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code, r.travel_date, r.trip_type, r.depart_time, r.arrive_time,
         r.return_time, r.province, r.destination, r.status, r.reject_reason
  from public.reservations r
  where r.phone = p_phone
  order by r.travel_date desc, r.created_at desc
  limit 50;
$$;

revoke execute on function public.lookup_reservations(text) from public, authenticated;
grant execute on function public.lookup_reservations(text) to anon;

create function public.lookup_reservation_by_code(p_code text)
returns table (
  code text,
  travel_date date,
  trip_type text,
  depart_time time,
  arrive_time time,
  return_time time,
  province text,
  destination text,
  status text,
  reject_reason text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code, r.travel_date, r.trip_type, r.depart_time, r.arrive_time,
         r.return_time, r.province, r.destination, r.status, r.reject_reason
  from public.reservations r
  where r.code = p_code
  limit 1;
$$;

revoke execute on function public.lookup_reservation_by_code(text) from public, authenticated;
grant execute on function public.lookup_reservation_by_code(text) to anon;
