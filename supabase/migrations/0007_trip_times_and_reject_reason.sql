-- Each trip type now asks only for the times it needs:
--   drop_off       depart_time
--   pick_up        arrive_time (at the pick-up place)
--   drop_and_pick  depart_time and return_time (pick-up for the way back)
--   drop_and_wait  depart_time and return_time (leaving for the way back)
-- Bookings made before this keep the extra times they were given.
alter table public.reservations
  alter column depart_time drop not null,
  alter column arrive_time drop not null,
  drop constraint reservations_check,
  drop constraint reservations_check1,
  add constraint reservations_trip_times check (
    case trip_type
      when 'pick_up' then arrive_time is not null
      when 'drop_off' then depart_time is not null
      else depart_time is not null
        and return_time is not null
        and return_time > depart_time
    end
  );

-- Why an admin turned a booking down, shown to the requester.
alter table public.reservations
  add column reject_reason text check (char_length(reject_reason) <= 500);

-- Rejecting now needs a reason; approving clears any earlier one.
drop function public.set_reservation_status(text, text);
drop function public.set_reservation_statuses(text[], text);

create function public.set_reservation_status(
  p_code text,
  p_status text,
  p_reason text default null
)
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
  if p_status = 'rejected' and coalesce(btrim(p_reason), '') = '' then
    raise exception 'a rejection needs a reason' using errcode = '22023';
  end if;

  update public.reservations
  set status = p_status,
      reject_reason = case when p_status = 'rejected' then btrim(p_reason) end
  where code = p_code
    and status in ('pending', 'approved', 'rejected')
    and status <> p_status;
  return found;
end;
$$;

revoke execute on function public.set_reservation_status(text, text, text) from public, anon;
grant execute on function public.set_reservation_status(text, text, text) to authenticated;

create function public.set_reservation_statuses(
  p_codes text[],
  p_status text,
  p_reason text default null
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

  update public.reservations
  set status = p_status,
      reject_reason = case when p_status = 'rejected' then btrim(p_reason) end
  where code = any (p_codes)
    and status in ('pending', 'approved', 'rejected')
    and status <> p_status;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke execute on function public.set_reservation_statuses(text[], text, text) from public, anon;
grant execute on function public.set_reservation_statuses(text[], text, text) to authenticated;
