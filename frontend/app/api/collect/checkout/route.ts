import { NextResponse } from "next/server";
import type { CollectCheckoutPayload, CartLinePayload } from "@/lib/collect/shared";
import { isCollectActive } from "@/lib/collect/server";
import { toJson } from "@/lib/gestion/mappers";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OptionGroup } from "@/lib/menu-data";

/*
 * Création d'une session Stripe Checkout (mode 'payment') pour une commande
 * à emporter. Le client envoie des références (ids + quantités) ; noms et
 * prix sont relus depuis la base. Le panier validé est stocké dans
 * collect_pending — le webhook le convertira en commande après paiement.
 */

interface ResolvedLine {
  item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  options: { group_name: string; choice_name: string; supplement: number }[];
}

function resolveOptions(
  choices: CartLinePayload["choices"],
  groups: OptionGroup[]
): ResolvedLine["options"] {
  return choices
    .map(({ groupId, choiceId }) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return null;
      const choice = group.choices.find((c) => c.id === choiceId);
      if (!choice) return null;
      return {
        group_name: group.name,
        choice_name: choice.name,
        supplement: choice.supplement,
      };
    })
    .filter((o): o is ResolvedLine["options"][number] => o !== null);
}

export async function POST(request: Request) {
  let body: CollectCheckoutPayload;
  try {
    body = (await request.json()) as CollectCheckoutPayload;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { slug, customer, pickupAt, lines } = body;
  if (!slug || !customer?.name?.trim() || !customer?.phone?.trim()) {
    return NextResponse.json(
      { error: "Nom, téléphone et restaurant requis." },
      { status: 400 }
    );
  }
  if (!lines?.length) {
    return NextResponse.json({ error: "Panier vide." }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: etablissement } = await db
    .from("etablissements")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!etablissement) {
    return NextResponse.json(
      { error: "Restaurant introuvable." },
      { status: 404 }
    );
  }

  if (!(await isCollectActive(etablissement.id))) {
    return NextResponse.json(
      { error: "Le click & collect n'est pas activé pour ce restaurant." },
      { status: 403 }
    );
  }

  const itemIds = lines.map((l) => l.itemId);
  const { data: dbItems, error: itemsError } = await db
    .from("items")
    .select("id, name, price, options, disponible")
    .eq("etablissement_id", etablissement.id)
    .in("id", itemIds);
  if (itemsError) throw new Error(itemsError.message);

  const itemsById = new Map(dbItems?.map((i) => [i.id, i]) ?? []);

  const resolved: ResolvedLine[] = [];
  for (const line of lines) {
    const item = itemsById.get(line.itemId);
    if (!item) {
      return NextResponse.json(
        { error: `Article « ${line.itemId} » introuvable.` },
        { status: 400 }
      );
    }
    if (item.disponible === false) {
      return NextResponse.json(
        { error: `« ${item.name} » n'est plus disponible.` },
        { status: 409 }
      );
    }
    const groups = (item.options ?? []) as unknown as OptionGroup[];
    const options = resolveOptions(line.choices, groups);
    const supplement = options.reduce((s, o) => s + o.supplement, 0);
    resolved.push({
      item_id: item.id,
      name: item.name,
      quantity: line.quantity,
      unit_price: item.price + supplement,
      options,
    });
  }

  const { data: pending, error: pendingError } = await db
    .from("collect_pending")
    .insert({
      etablissement_id: etablissement.id,
      payload: toJson({
        customer_name: customer.name.trim(),
        customer_phone: customer.phone.trim(),
        pickup_at: pickupAt ?? "",
        items: resolved,
      }),
    })
    .select("id")
    .single();
  if (pendingError) throw new Error(pendingError.message);

  const stripe = getStripe();
  const origin = new URL(request.url).origin;
  const collectOrigin = process.env.NEXT_PUBLIC_COLLECT_HOST
    ? `https://${process.env.NEXT_PUBLIC_COLLECT_HOST}`
    : origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: resolved.map((line) => ({
      price_data: {
        currency: "eur",
        unit_amount: Math.round(line.unit_price * 100),
        product_data: {
          name: line.name,
          ...(line.options.length > 0 && {
            description: line.options
              .map((o) => `${o.group_name} : ${o.choice_name}`)
              .join(", "),
          }),
        },
      },
      quantity: line.quantity,
    })),
    metadata: {
      pending_id: pending.id,
      etablissement_id: etablissement.id,
    },
    locale: "fr",
    success_url: `${collectOrigin}/${slug}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${collectOrigin}/${slug}`,
  });

  return NextResponse.json({ url: session.url });
}
