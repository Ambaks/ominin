-- Routage des tickets : chaque imprimante ne sort que les articles qui lui
-- sont affectés.  Sans affectation (aucune ligne dans item_printers pour
-- cette imprimante), le comportement actuel est conservé : tous les articles
-- sortent sur toutes les imprimantes.

create table public.item_printers (
  item_id    uuid not null references public.items(id)    on delete cascade,
  printer_id uuid not null references public.printers(id) on delete cascade,
  primary key (item_id, printer_id)
);

alter table public.item_printers enable row level security;

create policy "member read" on public.item_printers
  for select using (
    printer_id in (
      select id from public.printers
      where public.current_member_role(etablissement_id) is not null
    )
  );

create policy "gerant insert" on public.item_printers
  for insert with check (
    printer_id in (
      select id from public.printers
      where public.current_member_role(etablissement_id) = 'gerant'
    )
  );

create policy "gerant delete" on public.item_printers
  for delete using (
    printer_id in (
      select id from public.printers
      where public.current_member_role(etablissement_id) = 'gerant'
    )
  );
