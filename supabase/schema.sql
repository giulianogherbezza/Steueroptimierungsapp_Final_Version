-- Tabelle für gespeicherte Nutzerszenarien
-- Im Supabase SQL Editor ausführen (Dashboard → SQL Editor → New query)

create table if not exists szenarien (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  inputs      jsonb       not null,
  created_at  timestamptz not null default now()
);

-- Damit alle Nutzer lesen/schreiben können (für Schulprojekt ohne Auth)
alter table szenarien enable row level security;

create policy "Alle dürfen lesen"
  on szenarien for select using (true);

create policy "Alle dürfen schreiben"
  on szenarien for insert with check (true);

create policy "Alle dürfen löschen"
  on szenarien for delete using (true);
