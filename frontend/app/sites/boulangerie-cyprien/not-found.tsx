import { Stamp } from "@/components/sites/cyprien/stamp";
import { ButtonLink, vars } from "@/components/sites/cyprien/ui";
import { cyprienHref, orderPath } from "@/lib/sites/cyprien";

export default function CyprienNotFound() {
  return (
    <section className="cy-wrap cy-lost" aria-labelledby="titre-introuvable">
      <Stamp id="cachet-404" className="cy-lost-stamp" />
      <p className="cy-eyebrow cy-load" style={vars({ "--d": "0.25s" })}>
        Erreur 404
      </p>
      <h1 id="titre-introuvable" className="cy-h1 cy-load" style={vars({ "--d": "0.35s" })}>
        Cette page n’est pas
        <br />
        <em>sortie du four</em>
      </h1>
      <p className="cy-lead cy-load max-w-[38ch]" style={vars({ "--d": "0.5s" })}>
        L’adresse a peut-être changé. Le reste de la maison, lui, est bien là.
      </p>
      <div className="cy-load flex flex-wrap justify-center gap-3" style={vars({ "--d": "0.6s" })}>
        <ButtonLink href={cyprienHref("/")}>Retour à l’accueil</ButtonLink>
        <ButtonLink href={cyprienHref(orderPath)} variant="ghost">
          Commander
        </ButtonLink>
      </div>
    </section>
  );
}
