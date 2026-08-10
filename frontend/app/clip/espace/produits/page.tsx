"use client";

import {
  DiscoverLink,
  Pill,
  ProductCard,
} from "@/components/products/product-card";
import {
  clipProduct,
  collectProduct,
  offreProducts,
} from "@/lib/products";

/*
 * Catalogue Ominin dans l'espace clipper : Clip est le produit du client,
 * le reste est proposé. Aucune donnée de session n'est nécessaire — la page
 * sert donc aussi la démo publique.
 */
export default function ProduitsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="rise">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Produits
        </h1>
        <p className="mt-1 text-sm text-muted">
          Votre produit Ominin et le reste du catalogue.
        </p>
      </div>

      <div className="rise grid gap-4 lg:grid-cols-2">
        <ProductCard product={clipProduct} badge={<Pill>Votre produit</Pill>} />
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-lg font-medium">
            Autres produits Ominin
          </h2>
          <p className="mt-1 text-sm text-muted">
            Nos solutions pour les restaurants — à découvrir, ou à recommander.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {[collectProduct, ...offreProducts].map((product) => (
            <ProductCard key={product.id} product={product}>
              <DiscoverLink product={product} />
            </ProductCard>
          ))}
        </div>
      </section>
    </div>
  );
}
