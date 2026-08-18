-- Cash payment details: track how much the customer gave and change returned.
alter table orders
  add column cash_given  numeric(10,2),
  add column cash_change numeric(10,2);

alter table orders
  add constraint cash_fields_require_especes
    check (
      (cash_given is null and cash_change is null)
      or payment_mode = 'especes'
    );
