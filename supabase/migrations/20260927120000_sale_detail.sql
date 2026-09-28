alter table public.flour_items add column if not exists custom_name text;

alter table public.vegetable_sale_items add column if not exists applied_rate double precision;
alter table public.vegetable_sale_items add column if not exists opening_quantity double precision;
alter table public.vegetable_sale_items add column if not exists remaining_quantity double precision;
