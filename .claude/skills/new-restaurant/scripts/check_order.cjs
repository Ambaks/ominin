// Recette du parcours de commande : une modale d'options par section, puis un
// ajout complet au panier. Sur l'aperçu (/menu/demo/<slug>) une table fictive
// est déjà posée ; en production, passer ?table=1.
//
//   pw.sh check_order.cjs <url>
//
// Ne valide JAMAIS la commande : en production elle entrerait dans
// l'historique réel du restaurant. Code de sortie 1 si un contrôle échoue.
const { chromium } = require("playwright");

const url = process.argv[2];
if (!url) {
  console.error("usage : pw.sh check_order.cjs <url>");
  process.exit(2);
}

const failures = [];
const ok = (l, d = "") => console.log(`  OK      ${l}${d ? " — " + d : ""}`);
const fail = (l, d = "") => {
  failures.push(l);
  console.log(`  ÉCHEC   ${l}${d ? " — " + d : ""}`);
};

const inspectDialog = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const box = d.getBoundingClientRect();
    const cta = [...d.querySelectorAll("button")].pop();
    const ctaBox = cta.getBoundingClientRect();
    return {
      modal: d.getAttribute("aria-modal") === "true",
      labelled: !!d.getAttribute("aria-labelledby"),
      // Rendue à la racine du menu, hors des sections animées : un ancêtre en
      // transform en ferait sinon le bloc conteneur, feuille hors écran.
      portal: !d.closest(".reveal") &&
        (d.parentElement?.parentElement?.hasAttribute("data-menu-root") ||
          d.parentElement?.parentElement === document.body),
      // …et elle doit rester habillée comme la page (thème + polices) : rendue
      // dans document.body, elle retombait en palette et polices Ominin.
      themed: (() => {
        const root = document.querySelector("[data-menu-root]") || document.body;
        const same = (v) =>
          getComputedStyle(d).getPropertyValue(v).trim() === getComputedStyle(root).getPropertyValue(v).trim();
        // Le titre de la modale est un nom de plat : il se compare aux noms
        // des cartes, pas aux titres de section (manuscrits chez O’Crousti).
        const title = d.querySelector("h3");
        const heading = document.querySelector("main article h3");
        const font = (el) => (el ? getComputedStyle(el).fontFamily.split(",")[0] : null);
        return same("--ember-1") && same("--background") && font(title) === font(heading);
      })(),
      inViewport: box.top >= 0 && box.top < window.innerHeight,
      ctaVisible: ctaBox.top >= 0 && ctaBox.bottom <= window.innerHeight + 1,
      cta: cta.textContent.trim(),
      groups: [...d.querySelectorAll("fieldset legend")].map((l) => l.textContent.trim().replace(/\s+/g, " ")),
      scrollLocked: getComputedStyle(document.body).overflow === "hidden",
    };
  });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // Un robot de recette ne doit jamais compter comme visite d'un client réel.
  await page.route(/\/rpc\/menu_track/, (route) => route.abort());
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(1500);
  console.log(`\n${url}\n`);

  const buttons = await page.evaluate(() => {
    const all = [...document.querySelectorAll("article button")];
    return { total: all.length, disabled: all.filter((b) => b.disabled).length };
  });
  if (buttons.total === 0) {
    console.log("  INFO    aucun bouton de commande — offre sans commande à table");
    await browser.close();
    process.exit(0);
  }
  if (buttons.disabled === buttons.total) {
    fail("commande fermée", "tous les boutons sont désactivés : aucune table scannée, ajoute ?table=1");
    await browser.close();
    process.exit(1);
  }

  console.log("Une modale d'options par section");
  const sections = await page.locator("main section").count();
  let opened = 0;
  for (let i = 0; i < sections; i++) {
    const section = page.locator("main section").nth(i);
    const name = (await section.locator("h2").first().textContent())?.trim();
    const choose = section.locator("article button", { hasText: /^(Choisir|Composer)/ }).first();
    if (!(await choose.count())) continue;
    await choose.scrollIntoViewIfNeeded();
    await choose.click();
    await page.waitForTimeout(200); // volontairement court : c'est là que la feuille partait hors écran
    const d = await inspectDialog(page);
    opened++;
    if (!d) {
      fail(`${name} : la modale ne s'ouvre pas`);
      continue;
    }
    const problems = [
      !d.modal && "aria-modal absent",
      !d.labelled && "titre non relié (aria-labelledby)",
      !d.portal && "pas rendue hors des sections animées",
      !d.themed && "n'a pas le thème ni les polices de la page",
      !d.inViewport && "ouverte hors écran",
      !d.ctaVisible && "bouton de validation hors écran",
      !d.scrollLocked && "la page défile derrière",
    ].filter(Boolean);
    if (problems.length) fail(`${name}`, problems.join(", "));
    else ok(`${name}`, d.groups.join(" · "));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    if (await page.locator('[role="dialog"]').count()) {
      fail(`${name} : Échap ne ferme pas la modale`);
      await page.locator('[role="dialog"] button', { hasText: "Annuler" }).click();
    }
  }
  if (!opened) console.log("  INFO    aucun article à options");

  console.log("\nAjout au panier");
  // L'article le plus riche en choix d'abord (« Composer » : plusieurs
  // groupes), où un toucher perdu entre deux groupes se verrait.
  const composer = page.locator("article button", { hasText: /^Composer/ }).first();
  const first = (await composer.count())
    ? composer
    : page.locator("article button", { hasText: /^Choisir/ }).first();
  if (await first.count()) {
    await first.scrollIntoViewIfNeeded();
    await first.click();
    await page.waitForTimeout(500);
    const before = (await inspectDialog(page))?.cta;
    // Premier choix de chaque groupe obligatoire, comme un client pressé.
    // Groupes obligatoires : marqués data-required (leur étiquette dit
    // « 1 au choix », pas « obligatoire »).
    const required = page.locator('[role="dialog"] fieldset[data-required]');
    for (let g = 0; g < (await required.count()); g++) {
      // Un vrai clic au pointeur, au centre de l'option, et on vérifie qu'il
      // a pris : une garde de défilement mal levée avalait les suivants.
      const label = required.nth(g).locator("label").first();
      await label.scrollIntoViewIfNeeded();
      const box = await label.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(700);
      if (!(await required.nth(g).locator("input:checked").count())) {
        fail(`groupe ${g + 1} : le toucher n'a rien coché`);
        break;
      }
    }
    const after = (await inspectDialog(page))?.cta ?? "";
    if (!after.startsWith("Ajouter")) fail("choix obligatoires faits mais pas de prix", `« ${after} »`);
    else ok("libellé du bouton", `« ${before} » → « ${after} »`);
    await page.locator('[role="dialog"] button').last().click();
    await page.waitForTimeout(900);
  }
  const plain = page.locator("article button", { hasText: "+ Ajouter" }).first();
  if (await plain.count()) {
    await plain.scrollIntoViewIfNeeded();
    await plain.click();
    await page.waitForTimeout(900);
  }
  const bar = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((e) => getComputedStyle(e).position === "fixed" && /commande/i.test(e.textContent))
      .map((e) => e.textContent.trim().replace(/\s+/g, " "))[0] || null
  );
  if (bar) ok("barre de panier", bar);
  else fail("aucune barre de panier après ajout", "CartBar est-elle rendue sur cette route ?");

  if (bar && url.includes("/demo/")) {
    // La route d'aperçu est publique et la plupart des slugs existent en base :
    // une commande envoyée d'ici partirait en cuisine chez le vrai client.
    await page.locator("button", { hasText: "Voir la commande" }).first().click();
    await page.waitForTimeout(600);
    const send = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /envoy|aperçu/i.test(x.textContent));
      return b ? { disabled: b.disabled, label: b.textContent.trim() } : null;
    });
    if (send?.disabled && /aperçu/i.test(send.label)) ok("envoi verrouillé sur l'aperçu", `« ${send.label} »`);
    else fail("l'aperçu peut ENVOYER une commande réelle", JSON.stringify(send));
  }

  if (errors.length) fail(`${errors.length} erreur(s) JS`, [...new Set(errors)].slice(0, 3).join(" | "));
  await browser.close();
  console.log(failures.length ? `\n${failures.length} ÉCHEC(S)` : "\nParcours de commande conforme (commande non envoyée).");
  process.exit(failures.length ? 1 : 0);
})();
