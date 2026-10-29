-- A request may cover several days, each its own booking. The bookings made by
-- one request share a group id, so the admin page can show them together.
-- Bookings made before this have none.
alter table public.reservations
  add column group_id uuid;

create index reservations_group_id_idx on public.reservations (group_id);
