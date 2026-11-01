"""Plaquettes porte-à-porte par segment : python3 build.py bar|club|fast_food écrit <segment>/index.html.
Un seul gabarit et une seule feuille de style ; le contenu de chaque segment est dans content/<segment>.py.
Les graphiques viennent de frontend/lib/report/data.json. Puis : .claude/skills/ominin-pdf/scripts/build.sh <segment> <nom-du-pdf> ; le PDF coupé va dans frontend/public/commercial/plaquettes, le PDF de fond perdu reste ici."""
import importlib
import re
import sys
from pathlib import Path

from charts import heatmap, load_chart, mix_chart

HERE = Path(__file__).parent

MARK = '<svg class="mark" viewBox="116 107 280 300" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0b35b"/><stop offset=".55" stop-color="#e2764b"/><stop offset="1" stop-color="#c94f5e"/></linearGradient></defs><path d="M256 107 L396 247 V281 L256 141 L116 281 V247 Z" fill="url(#g)"/><path d="M256 170 L396 310 V344 L256 204 L116 344 V310 Z" fill="url(#g)"/><path d="M256 233 L396 373 V407 L256 267 L116 407 V373 Z" fill="url(#g)"/></svg>'
BRAND = f'<span class="brand">{MARK}Ominin</span>'


def phone(src, cls=""):
    return f'<figure class="phone {cls}"><img src="img/{src}.jpg" alt=""></figure>'


def tablet(src, cls=""):
    return f'<figure class="tablet {cls}"><img src="img/{src}.jpg" alt=""></figure>'


def header(section, n):
    return f'<header class="hd">{BRAND}<span class="sec">{section}</span><span class="num">{n}</span></header>'


def items(values):
    return "".join(f"<li>{v}</li>" for v in values)


def visual(screens):
    """Un téléphone devant un autre, ou une tablette seule."""
    if len(screens) == 1 and screens[0].startswith("g-"):
        return tablet(screens[0], "half")
    return phone(screens[0], "tall") + "".join(phone(s, "tall behind") for s in screens[1:])


def row(r, first=False):
    copy = f'<div class="side copy glass"><span class="kicker">{r["kicker"]}</span><h3>{r["title"]}</h3><p>{r["text"]}</p><ul>{items(r["points"])}</ul></div>'
    image = f'<div class="side visual">{visual(r["screens"])}</div>'
    body = image + copy if r["image_first"] else copy + image
    return f'<div class="row{" first" if first else ""}">{body}</div>'


def cover(s):
    tiles = "".join(f'<article class="glass"><h3>{t}</h3><p>{p}</p></article>' for t, p in s["pillars"])
    return f"""<section class="page dark cover" data-theme="dark" data-chevron="158,142,240" data-clear="66,303">
  <div class="inner">
    <div class="cover-title">{MARK}<h1>Ominin</h1></div>
    <p class="lead">{s["lead"]}</p>
    <div class="pillars">{tiles}</div>
    <div class="cover-stage">{tablet(s["tablet"], "cover-tablet")}{phone(s["phone"], "cover-phone")}</div>
  </div>
</section>"""


def page_rows(p, n, chevron, clear):
    intro = f'<h2>{p["title"]}</h2><p class="lead">{p["lead"]}</p>' if p.get("title") else ""
    rows = "".join(row(r, i == 0 and not intro) for i, r in enumerate(p["rows"]))
    note = f'<p class="note">{p["note"]}</p>' if p.get("note") else ""
    return f"""<section class="page paper" data-theme="paper" data-chevron="{chevron}" data-clear="{clear}">
  <div class="inner">{header(p["section"], n)}{intro}{rows}{note}</div>
</section>"""


def page_tools(p):
    c = p["cards"]
    stage = "".join(tablet(t, "wide") for t in p["tablets"])
    features = "".join(f"<div><b>{t}</b><span>{d}</span></div>" for t, d in p["features"])
    paragraphs = "".join(f"<p>{x}</p>" for x in c["text"])
    return f"""<section class="page dark" data-theme="dark" data-chevron="182,226,215" data-clear="136,276">
  <div class="inner">{header(p["section"], 4)}
    <div class="cards glass">
      <div class="cards-copy"><span class="kicker">{c["kicker"]}</span><h3>{c["title"]}</h3>{paragraphs}<p class="price">{c["price"]}</p><p class="small">{c["small"]}</p></div>
      <figure class="cards-img"><img src="../img/cartes.jpg" alt=""></figure>
    </div>
    <div class="backend">
      <span class="kicker">{p["kicker"]}</span><h2>{p["title"]}</h2><p class="lead">{p["lead"]}</p>
      <div class="backend-stage">{stage}</div>
      <div class="features glass">{features}</div>
    </div>
    {f'<p class="note">{p["note"]}</p>' if p.get("note") else ""}
  </div>
</section>"""


def page_proof(p):
    stats = "".join(f'<div class="glass"><b>{v}</b><span>{d}</span></div>' for v, d in p["stats"])
    research = "".join(f"<article><b>{v}</b><p>{d}</p><cite>{c}</cite></article>" for v, d, c in p["research"])
    a = p["aside"]
    return f"""<section class="page dark charts" data-theme="dark" data-chevron="22,205,225" data-clear="58,272">
  <div class="inner">{header(p["section"], 5)}
    <h2>{p["title"]}</h2><p class="lead">{p["lead"]}</p>
    <div class="stats">{stats}</div>
    <div class="research glass"><h3 class="research-title">{p["research_title"]}</h3>{research}</div>
    <div class="closing">{tablet(p["tablet"], "closing-tablet")}
      <aside class="payback glass"><span class="kicker">{a["kicker"]}</span><p>{a["text"]}</p><b>{a["strong"]}</b><small>{a["small"]}</small></aside>
    </div>
    <p class="note">{p["note"]}</p>
  </div>
</section>"""


def page_data(p):
    charts = {"heat": heatmap, "load": load_chart, "mix": mix_chart}
    panel = lambda x: f'<article class="panel glass"><h4>{x["title"]}</h4><p class="sub">{x["sub"]}</p>{charts[x["chart"]]()}<p class="read">{x["read"]}</p></article>'
    lever = "".join(f"<dt>{t}</dt><dd>{d}</dd>" for t, d in p["lever"])
    a, b, c = p["panels"]
    return f"""<section class="page dark charts" data-theme="dark" data-chevron="196,150,215" data-clear="56,272">
  <div class="inner">{header(p["section"], 6)}
    <h2>{p["title"]}</h2><p class="lead">{p["lead"]}</p>
    <div class="grid2">{panel(a)}{panel(b)}</div>
    <div class="grid2 second">{panel(c)}<article class="panel lever glass"><h4>{p["lever_title"]}</h4><dl>{lever}</dl></article></div>
    {tablet(p["strip"], "strip")}
    <p class="note">{p["note"]}</p>
  </div>
</section>"""


def page_compare(p):
    """Le tableau face au concurrent : seulement ce qu'on a lu chez lui, sources en bas de page."""
    yearly = "".join(f'<div class="glass{" us" if i == 0 else ""}"><span>{t}</span><b>{v}</b></div>' for i, (t, v) in enumerate(p["yearly"]))
    rows = "".join(f'<tr><th>{t}</th><td class="o">{u}</td><td>{o}</td></tr>' for t, u, o in p["rows"])
    c = p["claim"]
    return f"""<section class="page paper compare" data-theme="paper" data-chevron="182,118,165" data-clear="58,272">
  <div class="inner">{header(p["section"], 7)}
    <h2>{p["title"]}</h2><p class="lead">{p["lead"]}</p>
    <div class="yearly">{yearly}</div>
    <table class="glass"><thead><tr><th></th><th class="o">{BRAND}</th><th>{p["them"]}</th></tr></thead><tbody>{rows}</tbody></table>
    <div class="claim glass"><div><h3>{c["title"]}</h3><p>{c["text"]}</p><p class="url">{c["url"]}</p></div><img class="qr" src="img/{c["qr"]}.svg" alt=""></div>
    <p class="note">{p["note"]}</p>
  </div>
</section>"""


def page_start(p):
    steps = "".join(f'<li class="glass">{x}</li>' for x in p["steps"])
    return f"""<section class="page dark back" data-theme="dark" data-chevron="104,150,215" data-clear="46,284">
  <div class="inner">{header(p["section"], 8)}
    <h2>{p["title"]}</h2>
    <div class="start"><ol>{steps}</ol>{phone(p["phone"], "start-phone")}</div>
    <div class="contact glass solid">
      <div class="handwrite"><span class="kicker">Votre contact</span>
        <div class="line"><span>Prénom</span></div><div class="line"><span>Mobile</span></div><div class="line"><span>Une note pour vous</span></div>
        <p class="mail">support@ominin.com</p></div>
      <div class="qr-box"><img class="qr" src="img/qr-demo.svg" alt=""><p>{p["scan"]}</p></div>
    </div>
    <footer class="back-foot">{BRAND}<span>{p["foot"]}</span></footer>
  </div>
</section>"""


def typo(html):
    """Espaces insécables du français, dans le texte seulement."""
    parts = re.split(r"(<[^>]+>)", html)
    for i, part in enumerate(parts):
        if not part.startswith("<"):
            part = re.sub(r" ([%€:;?!»])", " \\1", part)
            parts[i] = re.sub(r"« ", "« ", part)
    return "".join(parts)


def main():
    segment = sys.argv[1]
    c = importlib.import_module(f"content.{segment}").CONTENT
    pages = [
        cover(c["cover"]),
        page_rows(c["p2"], 2, "34,150,175", "60,276"),
        page_rows(c["p3"], 3, "190,205,175", "18,303"),
        page_tools(c["p4"]),
        page_proof(c["p5"]),
        page_data(c["p6"]),
        page_compare(c["p7"]),
        page_start(c["p8"]),
    ]
    out = HERE / segment
    (out / "img").mkdir(parents=True, exist_ok=True)
    head = '<link rel="stylesheet" href="../fonts/instrument.css"><link rel="stylesheet" href="../styles.css"><link rel="stylesheet" href="bg.css">'
    html = f'<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Ominin</title>{head}</head>\n<body>{typo("".join(pages))}</body></html>'
    (out / "index.html").write_text(html)


main()
