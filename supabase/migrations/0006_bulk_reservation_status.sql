-- Approves or rejects many bookings at once, with the same rules as
-- set_reservation_status. Returns how many rows changed.
create function public.set_reservation_statuses(p_codes text[], p_status text)
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

  update public.reservations
  set status = p_status
  where code = any (p_codes)
    and status in ('pending', 'approved', 'rejected')
    and status <> p_status;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke execute on function public.set_reservation_statuses(text[], text) from public, anon;
grant execute on function public.set_reservation_statuses(text[], text) to authenticated;
