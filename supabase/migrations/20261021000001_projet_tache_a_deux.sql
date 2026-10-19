-- Une étape peut être confiée aux deux : owner = 'both'.
alter table public.projet_steps drop constraint projet_steps_owner_check;
alter table public.projet_steps
  add constraint projet_steps_owner_check check (owner in ('marwan', 'ambaka', 'both'));
