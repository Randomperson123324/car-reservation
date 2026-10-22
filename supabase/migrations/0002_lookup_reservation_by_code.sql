-- Lookup by booking code, for the QR code on the reservation slip. Returns the
-- same non-personal columns as the lookup by phone.
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
  where r.code = p_code
  limit 1;
$$;

revoke execute on function public.lookup_reservation_by_code(text) from public, authenticated;
grant execute on function public.lookup_reservation_by_code(text) to anon;
