create table if not exists public.banner_messages (
  id bigserial primary key,
  message text not null,
  actif boolean default true,
  position integer default 1,
  created_at timestamptz default now()
);

alter table public.banner_messages enable row level security;

create policy "read banner" on public.banner_messages for select using (true);

create policy "manage banner" on public.banner_messages for all using (true) with check (true);
