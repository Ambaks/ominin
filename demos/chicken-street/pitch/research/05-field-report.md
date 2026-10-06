# Ominin field report (public page ominin.com/r7k2)

Source: frontend/lib/report/data.json on main (commit 3e40714 / 99dd167), anonymized BOHO data. A bar-restaurant in Toulouse, 16 service nights, Fri 18 Sept to Sat 3 Oct 2026.

- Paid orders: 2 002 (online 435, counter 1 545, fallback 22).
- Order → kitchen ticket, median: online 18 s (p90 57 s), counter 279 s = 4 min 39 (p90 967 s). Tickets print only once the order is fully paid.
- Online share of orders, last weekend (2–3 Oct): 47.1 % (41.1 % of revenue). Online payment launched 24 Sept → 9 days.
- Saturday 26 Sept, "Payer en ligne" made the default at 22:38: online share 15.2 % before → 31.9 % after (×2).
- Waiting avoided: 31.5 h (435 online orders × median gap).
- Online payment success: 50.8 % before 3-D Secure, 91.7 % after (30 Sept).
