-- Critères 8, 9, 9 bis, 9 ter ; 13.2 n° 1, 2 et 10 ; fonctions admin.
begin;
\i /work/tests/fixtures.inc

create function pg_temp.lead(p uuid) returns text language sql as $$
  select status::text from public.crm_leads where restaurant_id = p;
$$;
-- Le dernier changement de statut d'un restaurant a été écrit par le reflet.
create function pg_temp.by_reflect(p uuid) returns boolean language sql as $$
  select coalesce((metadata ->> 'reflect')::boolean, false) from public.crm_activities
  where restaurant_id = p and type = 'status_change' order by created_at desc, (metadata ->> 'reflect') nulls first limit 1;
$$;

-- 8. Le reflet suit le tableau 4.3, case décochée comprise.
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r1', '{menu}', :'contact') ->> 'id' as d1 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d1', 'confirm', null);
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r1') = 'to_contact' and pg_temp.by_reflect(:'r1'), '8 / 13.2 n° 2. confirmation par l''admin → to_contact, drapeau posé');
select pg_temp.act(:'a_user');
select public.commercial_set_step(:'d1', 1, true);
select public.commercial_set_step(:'d1', 2, true);
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r1') = 'to_contact', '8. étapes 1 et 2 → to_contact');
select pg_temp.act(:'a_user');
select public.commercial_set_step(:'d1', 4, true);
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r1') = 'visited', '8. étape 4 cochée avant la 3 → visited');
select pg_temp.act(:'a_user');
select public.commercial_set_step(:'d1', 3, true);
select public.commercial_set_step(:'d1', 5, true);
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r1') = 'negotiation' and pg_temp.by_reflect(:'r1'), '8 / 13.2 n° 2. étape 5 → negotiation, fonction du commercial');
select pg_temp.act(:'a_user');
select public.commercial_set_step(:'d1', 5, false);
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r1') = 'visited', '8. case 5 décochée → recalculé (visited)');
select pg_temp.act(:'a_user');
select public.commercial_set_step(:'d1', 4, false);
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r1') = 'contacted', '8. case 4 décochée → contacted');
select pg_temp.ok((select step_done_at ? '3' and not step_done_at ? '4' from public.commercial_declarations where id = :'d1'),
  '5.3. une date par étape cochée');

-- 9. Sous le service_role sans drapeau, Léa ne change pas le statut.
select pg_temp.act_service();
update public.crm_leads set status = 'new' where restaurant_id = :'r1';
update public.crm_leads set status = 'interested' where restaurant_id = :'r1';
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r1') = 'contacted', '9. update de Léa sans effet sur un restaurant déclaré');
-- L'écran admin non plus.
select pg_temp.act(:'admin');
update public.crm_leads set status = 'lost' where restaurant_id = :'r1';
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r1') = 'contacted', '4.3. l''écran admin ne change pas le statut d''un restaurant déclaré');
-- Un restaurant non déclaré garde son comportement.
select pg_temp.act_service();
update public.crm_leads set status = 'contacted' where restaurant_id = :'r9';
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r9') = 'contacted', '9. restaurant libre : Léa écrit normalement');

-- 9. commercial_confirm_due (service_role, drapeau posé) écrit le reflet.
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r2', '{menu}', :'contact') ->> 'id' as d2 \gset
select pg_temp.reset();
update public.crm_leads set status = 'new' where restaurant_id = :'r2';
update public.commercial_declarations set confirm_deadline = now() - interval '1 minute' where id = :'d2';
select pg_temp.act_service();
select public.commercial_confirm_due();
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r2') = 'to_contact' and pg_temp.by_reflect(:'r2'), '9 / 13.2 n° 2. commercial_confirm_due écrit to_contact');

-- 9. La sélection de Léa ne renvoie pas le restaurant ; ses e-mails
-- approuvés passent en « annulé » à la déclaration.
insert into public.outreach_emails (restaurant_id, direction, kind, status, to_email)
values (:'r3', 'outbound', 'cold', 'approved', 'r3@resto.test'),
       (:'r3', 'outbound', 'reply', 'pending_approval', 'r3@resto.test'),
       (:'r3', 'outbound', 'cold', 'draft', 'r3@resto.test'),
       (:'r3', 'outbound', 'cold', 'sent', 'r3@resto.test');
select pg_temp.act_service();
select pg_temp.ok(not public.crm_is_reserved(:'r3'), '9. libre : sélectionnable par Léa');
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r3', '{menu}', :'contact') ->> 'id' as d3 \gset
select pg_temp.act_service();
select pg_temp.ok(public.crm_is_reserved(:'r3'), '9. déclaré : écarté de la sélection de Léa');
select pg_temp.reset();
select pg_temp.ok((select count(*) from public.outreach_emails where restaurant_id = :'r3' and status = 'cancelled') = 3
  and (select count(*) from public.outreach_emails where restaurant_id = :'r3' and status = 'sent') = 1,
  '9. brouillons, réponses à valider et e-mails approuvés annulés à la déclaration');

-- Réponse tardive à Léa d'un restaurant réservé : le titulaire est prévenu
-- du sens de la réponse, sans son contenu.
insert into public.outreach_emails (restaurant_id, direction, status, classification, body_text)
values (:'r3', 'inbound', 'received', 'question', 'Combien ça coûte ?');
select pg_temp.ok(exists (select 1 from public.commercial_emails
  where declaration_id = :'d3' and kind = 'lea_reply' and detail = 'question'), '4.3. le titulaire apprend que le restaurant a répondu');

-- 9 bis. L'opposition sur un restaurant réservé abandonne la déclaration.
select pg_temp.act_service();
update public.crm_restaurants set outreach_opted_out_at = now() where id = :'r3';
select pg_temp.reset();
select pg_temp.ok(status = 'abandoned' and end_reason = 'opposition', '9 bis. déclaration abandonnée, motif opposition')
from public.commercial_declarations where id = :'d3';
select pg_temp.ok(exists (select 1 from public.commercial_emails where declaration_id = :'d3' and kind = 'opposition' and sent_at is null),
  '9 bis. e-mail au titulaire en file');
select pg_temp.ok(pg_temp.lead(:'r3') = 'lost' and pg_temp.by_reflect(:'r3'), '9 bis / 13.2 n° 2. trigger d''opposition : reflet lost');

-- Bouton du commercial : opposition + liste d'opposition pour chaque adresse.
select pg_temp.act(:'a_user');
select public.commercial_contact_upsert(:'d1', '{"role": "Associé", "email": "Assoc@Resto.test"}');
select public.commercial_opt_out(:'r1');
select pg_temp.reset();
select pg_temp.ok(status = 'abandoned' and end_reason = 'opposition', '5.3. bouton opposition : déclaration abandonnée')
from public.commercial_declarations where id = :'d1';
select pg_temp.ok((select count(*) from public.outreach_suppressions where restaurant_id = :'r1' and reason = 'manual') = 2,
  '5.3. chaque e-mail connu entre dans la liste d''opposition');
select pg_temp.ok((select notes is null from public.crm_contacts where email = 'assoc@resto.test'),
  '13.2 n° 11. le champ notes n''est jamais écrit');

-- 8. Une expiration donne lost (expire_due, drapeau posé).
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r4', '{menu}', :'contact') ->> 'id' as d4 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d4', 'confirm', null);
select pg_temp.reset();
update public.commercial_declarations set reserved_until = now() - interval '1 minute' where id = :'d4';
-- 13.2 n° 10 : lue expirée avant la tâche.
select pg_temp.ok(public.commercial_status_at(d) = 'expired', '13.2 n° 10. réservation échue lue expirée')
from public.commercial_declarations d where id = :'d4';
select pg_temp.act(:'b_user');
select pg_temp.ok((public.commercial_restaurant(:'r4') -> 'state' ->> 'kind') = 'free', '13.2 n° 10. le restaurant se lit libre');
select pg_temp.act_service();
select public.commercial_expire_due();
select pg_temp.reset();
select pg_temp.ok(status = 'expired' and ended_at = reserved_until, '8. expirée par la tâche')
from public.commercial_declarations where id = :'d4';
select pg_temp.ok(pg_temp.lead(:'r4') = 'lost' and pg_temp.by_reflect(:'r4')
  and (select lost_reason from public.crm_leads where restaurant_id = :'r4') = 'expired', '8 / 13.2 n° 2. expiration → lost');

-- 13.2 n° 1. Contrat du commercial terminé : réservations libérées.
select pg_temp.act(:'b_user');
select public.commercial_declare(:'r5', '{menu}', :'contact') ->> 'id' as d5 \gset
select pg_temp.reset();
update public.commerciaux set ended_at = now() - interval '1 second', end_reason = 'resignation' where id = :'b';
select pg_temp.act_service();
select public.commercial_release_ended() as released \gset
select pg_temp.reset();
select pg_temp.ok(status = 'abandoned' and end_reason = 'contract_ended', '13.2 n° 1. libérée, motif fin de contrat')
from public.commercial_declarations where id = :'d5';
select pg_temp.ok(pg_temp.lead(:'r5') = 'lost' and pg_temp.by_reflect(:'r5'), '13.2 n° 1 / n° 2. reflet lost');
update public.commerciaux set ended_at = null, end_reason = null where id = :'b';

-- Le terme sans option met fin au contrat (calculé depuis la signature).
update public.legal_acceptances set accepted_at = now() - interval '25 months' where commercial_id = :'b';
select pg_temp.act_service();
select public.commercial_release_ended();
select pg_temp.reset();
select pg_temp.ok(end_reason = 'term' and ended_at = (select accepted_at from public.legal_acceptances where commercial_id = :'b') + interval '24 months',
  '4.6. terme atteint : fin de contrat écrite')
from public.commerciaux where id = :'b';
update public.commerciaux set ended_at = null, end_reason = null where id = :'b';
update public.legal_acceptances set accepted_at = now() - interval '20 days' where commercial_id = :'b';

-- Déclaration reçue par e-mail, plus ancienne qu'une déclaration en attente.
select pg_temp.act(:'b_user');
select public.commercial_declare(:'r6', '{menu}', :'contact') ->> 'id' as d6b \gset
select pg_temp.reset();
update public.crm_leads set status = 'new' where restaurant_id = :'r6';
select pg_temp.act(:'admin');
select public.admin_record_email_declaration(:'a', :'r6', now() - interval '2 days', '{menu}', '{"role": "Gérant"}') ->> 'id' as d6a \gset
select pg_temp.reset();
select pg_temp.ok(status = 'refused' and refusal_reason = 'declared', '4.2. la concurrente plus récente est refusée')
from public.commercial_declarations where id = :'d6b';
select pg_temp.ok(status = 'pending' and channel = 'email' and declared_at = now() - interval '2 days'
  and confirm_deadline = declared_at + interval '7 days', '4.2. déclaration par e-mail à sa date d''origine')
from public.commercial_declarations where id = :'d6a';
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_record_email_declaration(%L, %L, now() - interval ''1 day'', ''{menu}'', ''{"role": "Gérant"}'')', :'b', :'r6')),
  '4.2. une déclaration plus ancienne garde le restaurant : conflit');
select public.admin_decide_declaration(:'d6a', 'confirm', null);
select pg_temp.reset();
select pg_temp.ok(pg_temp.lead(:'r6') = 'to_contact', '13.2 n° 2. admin_decide après admin_record_email_declaration');

-- Réattribution : accord écrit exigé, fenêtre conservée, reflet écrit.
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_reassign_declaration(%L, %L, ''Accord'', null)', :'d6a', :'b')),
  '4.2. réattribution sans accord écrit refusée');
select public.admin_reassign_declaration(:'d6a', :'b', 'Accord écrit de A', 'aaaa/accord.pdf') as d6r \gset
select pg_temp.reset();
select pg_temp.ok(o.status = 'abandoned' and o.end_reason = 'reassigned' and o.decision_document = 'aaaa/accord.pdf'
  and n.status = 'confirmed' and n.commercial_id = :'b' and n.reserved_until = o_until.u and n.reassigned_from = o.id,
  '4.2. réattribuée, tracée, même fenêtre')
from public.commercial_declarations o, public.commercial_declarations n,
     (select confirmed_at + interval '6 months' as u from public.commercial_declarations where id = :'d6a') o_until
where o.id = :'d6a' and n.id = :'d6r';
select pg_temp.ok(pg_temp.by_reflect(:'r6'), '13.2 n° 2. admin_reassign_declaration écrit sous drapeau');

-- Marquer signée (avant le lien d'inscription), y compris depuis l'attente.
select pg_temp.act(:'b_user');
select public.commercial_declare(:'r7', '{menu}', :'contact') ->> 'id' as d7 \gset
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_mark_signed(%L, %L, null)', :'d7', :'etab')),
  '4.1. un établissement déjà relié à une autre fiche est refusé');
select pg_temp.reset();
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values ('00000000-0000-0000-0000-0000000e7ab2', 'sept', 'Sept Mers', '', '', '', '');
select pg_temp.act(:'admin');
select public.admin_mark_signed(:'d7', '00000000-0000-0000-0000-0000000e7ab2', null);
select pg_temp.reset();
select pg_temp.ok(status = 'signed' and confirmed_at is not null, '13.2 n° 11. inscription pendant l''attente : confirmée puis signée')
from public.commercial_declarations where id = :'d7';
select pg_temp.ok(pg_temp.lead(:'r7') = 'signed' and pg_temp.by_reflect(:'r7'), '13.2 n° 2. admin_mark_signed → signed');
select pg_temp.ok((select etablissement_id from public.crm_restaurants where id = :'r7') = '00000000-0000-0000-0000-0000000e7ab2', '4.2. fiche reliée à l''établissement');
select pg_temp.ok(exists (select 1 from public.commercial_emails where declaration_id = :'d7' and kind = 'signed'), '4.2. e-mail de signature (art. 6.2)');
update public.crm_restaurants set etablissement_id = null where id = :'r7';

-- Forcer « en discussion ».
select pg_temp.act(:'admin');
select public.admin_set_in_talks(:'r8', true);
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r8', '{menu}', :'contact') ->> 'refusal_reason' as why8 \gset
select pg_temp.reset();
select pg_temp.ok(:'why8' = 'in_talks', '4.3. l''admin force l''état « en discussion »');

-- 9 ter. Les requêtes de l'admin (store et push du soir) filtrent les
-- relances et rendez-vous des commerciaux.
select pg_temp.act(:'b_user');
select public.commercial_task_upsert(:'d6r', jsonb_build_object('title', 'Relance B', 'due_at', now() + interval '1 day'));
select public.commercial_appointment_upsert(:'d6r', jsonb_build_object('title', 'RDV B', 'start_at', now() + interval '1 day'));
select pg_temp.act(:'admin');
insert into public.crm_tasks (restaurant_id, title, due_at) values (:'r9', 'Relance admin', now());
insert into public.crm_appointments (restaurant_id, title, start_at) values (:'r9', 'RDV admin', now() + interval '1 day');
select pg_temp.ok((select count(*) from public.crm_tasks where status = 'open' and declaration_id is null) = 1
  and (select count(*) from public.crm_tasks where status = 'open') = 2, '9 ter. store : relances des commerciaux exclues par declaration_id is null');
select pg_temp.ok((select count(*) from public.crm_appointments where status = 'scheduled' and declaration_id is null) = 1,
  '9 ter. push du soir : rendez-vous des commerciaux exclus');
select pg_temp.ok((select lead_id is null from public.crm_tasks where title = 'Relance B'), '13.2 n° 7. relance du commercial sans lead_id');
select pg_temp.ok((select next_follow_up_at is null from public.crm_leads where restaurant_id = :'r6'), '13.2 n° 7. rien dans next_follow_up_at');
select pg_temp.reset();

rollback;
