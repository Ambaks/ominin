"""Données FICTIVES pour les captures de gestion, sur une base Supabase LOCALE uniquement.
Usage : python3 donnees_fictives.py <conteneur postgres local> ; chaque établissement reçoit 70 jours de commandes, une équipe, sa fidélité."""
import datetime as dt
import random
import subprocess
import sys
import uuid

CONTAINER = sys.argv[1]
random.seed(11)
NOW = dt.datetime.now().replace(microsecond=0)
DAYS = 70
HOURS_BAR = {17: 5, 18: 12, 19: 18, 20: 18, 21: 16, 22: 12, 23: 9}
HOURS_FF = {11: 8, 12: 30, 13: 22, 14: 6, 15: 2, 16: 2, 17: 3, 18: 6, 19: 18, 20: 24, 21: 14, 22: 5}
HOURS_CLUB = {23: 18, 0: 30, 1: 34, 2: 22, 3: 10}
VENUES = {
    "le-novelty": dict(week=[30, 34, 38, 46, 88, 112, 36], hours=HOURS_BAR, tables=True, staff=[("Inès", "serveur"), ("Tom", "serveur"), ("Maya", "serveur"), ("Noé", "serveur"), ("Lucie", "cuisinier")], rewards=[("Un soft offert", 50), ("Des planches à partager", 150), ("Une consommation offerte", 200)]),
    "o-crousti-poulet": dict(week=[70, 74, 80, 88, 118, 136, 96], hours=HOURS_FF, tables=False, staff=[("Sami", "serveur"), ("Jade", "serveur"), ("Karim", "cuisinier"), ("Paul", "cuisinier")], rewards=[("Une boisson offerte", 40), ("Un dessert offert", 80), ("Un menu offert", 160)]),
    "l-etoile-demo": dict(week=[0, 0, 0, 40, 210, 280, 0], hours=HOURS_CLUB, tables=False, staff=[("Léo", "serveur"), ("Anaïs", "serveur"), ("Rayan", "serveur"), ("Eva", "serveur")], rewards=[("Un soft offert", 60), ("Une consommation offerte", 150), ("Une entrée au vestiaire offerte", 100)]),
}
NAMES = ["Camille Roux", "Hugo Martin", "Sarah Benali", "Lucas Petit", "Emma Laurent", "Yanis Haddad", "Chloé Morel", "Nathan Faure", "Léa Garnier", "Adam Girard", "Manon Blanc", "Théo Lambert", "Jade Fontaine", "Enzo Rossi", "Inès Mercier", "Louis Bonnet", "Lina Dupuis", "Maxime Henry", "Zoé Perrin", "Ethan Colin"]


def q(sql):
    return subprocess.run(["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-At", "-F", "|", "-c", sql], capture_output=True, text=True, check=True).stdout.strip().splitlines()


def esc(value):
    return value.replace("'", "''")


def venue_sql(slug, v):
    E = q(f"select id from etablissements where slug='{slug}'")[0]
    tables = [l.split("|")[0] for l in q(f"select id from tables where etablissement_id='{E}'")]
    items = [l.split("|") for l in q(f"select i.id,i.name,i.price from items i join categories c on c.id=i.category_id where c.etablissement_id='{E}'")]
    weights = [random.uniform(0.25, 3.2) for _ in items]
    features = '{"fidelite":true,"analyses":true}'
    sql = [
        f"update etablissements set platform_fee_percent=3,loyalty_enabled=true,loyalty_points_per_euro=1 where id='{E}';",
        f"insert into etablissement_settings(etablissement_id,features) values('{E}','{features}') on conflict(etablissement_id) do update set features=coalesce(etablissement_settings.features,'{{}}'::jsonb)||'{features}'::jsonb;",
        f"insert into analyses_settings(etablissement_id,hourly_labor_cost,orders_per_server_hour) values('{E}',19,20) on conflict(etablissement_id) do update set hourly_labor_cost=19,orders_per_server_hour=20;",
        f"insert into category_costs(category_id,etablissement_id,cost_percent) select id,'{E}',27 from categories where etablissement_id='{E}' on conflict do nothing;",
    ]
    sql += [f"insert into loyalty_rewards(etablissement_id,label,points) values('{E}','{esc(label)}',{points});" for label, points in v["rewards"]]
    staff = [(str(uuid.uuid4()), n, r) for n, r in v["staff"]]
    sql += [f"insert into staff(id,etablissement_id,name,role) values('{s}','{E}','{n}','{r}');" for s, n, r in staff]
    customers = []
    for _ in range(320):
        c, age = str(uuid.uuid4()), random.randint(0, DAYS)
        customers.append((c, age))
        sql.append(f"insert into loyalty_customers(id,etablissement_id,contact,created_at) values('{c}','{E}','06{random.randint(10000000, 99999999)}','{(NOW - dt.timedelta(days=age)).isoformat()}+01');")
    for ago in range(DAYS, -1, -1):
        day = (NOW - dt.timedelta(days=ago)).date()
        base = v["week"][day.weekday()] * (0.82 + 0.32 * (DAYS - ago) / DAYS)
        count = int(random.gauss(base, base * 0.1)) if base else 0
        share = 0.08 + 0.2 * (DAYS - ago) / DAYS
        number = 0
        moments = []
        for _ in range(count):
            hour = random.choices(list(v["hours"]), list(v["hours"].values()))[0]
            moments.append(dt.datetime.combine(day + dt.timedelta(days=1 if hour < 6 else 0), dt.time(hour, random.randint(0, 59), random.randint(0, 59))))
        if ago == 0:
            moments += [NOW - dt.timedelta(minutes=random.randint(1, 45), seconds=random.randint(0, 59)) for _ in range(14)]
        for t in sorted(moments):
            if t > NOW:
                continue
            number += 1
            o, mode = str(uuid.uuid4()), random.choices(["en_ligne", "carte", "especes"], [46, 36, 18])[0]
            pool = [c for c, a in customers if a >= ago]
            customer = random.choice(pool) if pool and random.random() < share else None
            age = NOW - t
            live, recent = age < dt.timedelta(minutes=18), age < dt.timedelta(minutes=40)
            cancelled = not live and random.random() < 0.018
            status = "annulee" if cancelled else (random.choice(["en_attente", "en_preparation", "payee", "prete"]) if live else ("payee" if recent else "servie"))
            unpaid = cancelled or (live and status == "en_attente")
            online = mode == "en_ligne" and not unpaid
            table = f"'{random.choice(tables)}'" if v["tables"] else "null"
            num = "null" if v["tables"] else number
            ready = "null" if status in ("en_attente", "en_preparation", "payee", "annulee") else f"'{(t + dt.timedelta(minutes=random.randint(4, 12))).isoformat()}+01'"
            sql.append(f"insert into orders(id,etablissement_id,table_id,status,payment_mode,created_at,paid_online,type,loyalty_customer_id,tip_amount,order_number,ready_at) values('{o}','{E}',{table},'{status}',{'null' if unpaid else repr(mode)},'{t.isoformat()}+01',{str(online).lower()},'sur_place',{repr(customer) if customer else 'null'},0,{num},{ready});")
            for line in random.choices(items, weights, k=random.choice([1, 2, 2, 3, 3, 4])):
                paid = "null" if unpaid else repr((t + dt.timedelta(minutes=random.randint(1, 20))).isoformat() + "+01")
                served = "null" if live or cancelled else paid
                sql.append(f"insert into order_items(order_id,item_id,name,quantity,unit_price,options,paid_mode,paid_at,served_at) values('{o}','{line[0]}','{esc(line[1])}',{random.choice([1, 1, 1, 2])},{line[2]},'[]',{'null' if unpaid else repr(mode)},{paid},{served});")
            if customer and not unpaid:
                sql.append(f"insert into loyalty_entries(customer_id,order_id,kind,points,created_at) values('{customer}','{o}','gain',{random.randint(8, 60)},'{t.isoformat()}+01');")
        if not count:
            continue
        team = [s for s in staff if s[2] == "cuisinier"][:1 + (day.weekday() >= 4)] + random.sample([s for s in staff if s[2] == "serveur"], min(2 + (day.weekday() >= 4), len([s for s in staff if s[2] == "serveur"])))
        for s, name, _ in team:
            first = min(v["hours"], key=lambda h: (h - 6) % 24)
            start = dt.datetime.combine(day, dt.time((first - 1) % 24, 0))
            end = start + dt.timedelta(hours=random.choice([6, 7, 8]))
            if end < NOW:
                sql.append(f"insert into time_entries(id,etablissement_id,staff_id,member_name,signature_in,started_at,ended_at) values('{uuid.uuid4()}','{E}','{s}','{name}','fictive','{start.isoformat()}+01','{end.isoformat()}+01');")
            sql.append(f"insert into shifts(etablissement_id,staff_id,starts_at,ends_at) values('{E}','{s}','{start.isoformat()}+01','{end.isoformat()}+01');")
    return sql


def club_sql():
    """Ce soir et les soirées passées de L'Étoile : des réservations, des paiements, des arrivées, une liste d'invités."""
    E = q("select id from etablissements where slug='l-etoile-demo'")[0]
    fee = 0.05
    tables = [l.split("|") for l in q(f"select t.id,z.price_cents,t.seats from club_tables t join club_zones z on z.id=t.zone_id where t.etablissement_id='{E}'")]
    today = NOW.date()
    sql = []
    nights = [("orbite-ce-soir", "Orbite", today, 0.72)] + [(f"supernova-{k}", "Supernova", today - dt.timedelta(days=7 * k), 0.8) for k in range(1, 7)]
    for slug, title, day, fill in nights:
        ev = str(uuid.uuid4())
        start = dt.datetime.combine(day, dt.time(23, 0))
        end = start + dt.timedelta(hours=6)
        sql.append(f"insert into club_events(id,etablissement_id,slug,title,tag,starts_at,ends_at,published,guest_list_open,guest_list_capacity) values('{ev}','{E}','{slug}','{title}','{title}','{start.isoformat()}+01','{end.isoformat()}+01',true,true,80);")
        for table in random.sample(tables, int(len(tables) * fill)):
            b, price = str(uuid.uuid4()), int(table[1])
            charge = round(price * fee)
            name = random.choice(NAMES)
            shape = random.choices(["full", "deposit", "shared"], [50, 30, 20])[0]
            first = price if shape == "full" else (round(price * 0.1) if shape == "deposit" else round(price / 2))
            arrived = day < today
            status = "arrivee" if arrived else "payee"
            shared = shape == "shared"
            share = f"'{uuid.uuid4().hex}'" if shared else "null"
            paid = price if arrived else first
            arrived_at = f"'{(start + dt.timedelta(minutes=random.randint(20, 150))).isoformat()}+01'" if arrived else "null"
            sql.append(f"insert into club_bookings(id,etablissement_id,event_id,table_id,name,phone,email,party_size,price_cents,fee_cents,total_cents,status,source,shared,share_token,paid_cents,paid_at,arrived_at,created_at) values('{b}','{E}','{ev}','{table[0]}','{name}','0600000000','client@exemple.fr',{min(int(table[2]), random.randint(4, 10))},{price},{charge},{price + charge},'{status}','en_ligne',{str(shared).lower()},{share},{paid},'{(start - dt.timedelta(days=2)).isoformat()}+01',{arrived_at},'{(start - dt.timedelta(days=3)).isoformat()}+01');")
            sql.append(f"insert into club_payments(booking_id,etablissement_id,name,email,phone,organiser,amount_cents,fee_cents,total_cents,method,status,paid_at) values('{b}','{E}','{name}','client@exemple.fr','0600000000',true,{first},{charge},{first + charge},'en_ligne','payee','{(start - dt.timedelta(days=2)).isoformat()}+01');")
            if arrived and paid > first:
                sql.append(f"insert into club_payments(booking_id,etablissement_id,name,organiser,amount_cents,fee_cents,total_cents,method,status,paid_at) values('{b}','{E}','{name}',false,{paid - first},0,{paid - first},'sur_place','payee',{arrived_at});")
        for _ in range(26):
            sql.append(f"insert into club_guests(etablissement_id,event_id,name,party_size,phone) values('{E}','{ev}','{random.choice(NAMES)}',{random.randint(1, 4)},'06{random.randint(10000000, 99999999)}');")
    return sql


lines = ["begin;", "set session_replication_role=replica;"]
for slug, venue in VENUES.items():
    lines += venue_sql(slug, venue)
lines += club_sql()
lines.append("commit;")
print("\n".join(lines))
