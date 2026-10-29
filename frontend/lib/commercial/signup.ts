import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { compose, describeAnswers, parseAnswers } from "@/lib/composer";
import { postDiscord } from "@/lib/discord";
import { card, escapeHtml } from "@/lib/gestion/invite-notify";
import { sendEmail } from "@/lib/gmail";
import { acceptContract, assertVersionsMatch } from "@/lib/legal/server";
import { contactEmail } from "@/lib/landing-data";
import { slugify } from "@/lib/shop/format";
import { menuSiteUrl } from "@/lib/site";
import { connectStatus } from "@/lib/stripe/connect";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json, Tables } from "@/lib/supabase/database.types";
import { SIGNUP_KINDS, type LinkState, type SignupAccountInput, type SignupProgress } from "./signup-form";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * L'inscription d'un restaurant avec un commercial, côté serveur. Le gérant
 * n'est jamais connecté pendant le questionnaire (il peut le remplir sur le
 * téléphone du commercial) : chaque étape s'autorise par le jeton de
 * l'inscription et s'écrit par la clé service.
 */

export class SignupError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export interface Signup extends Tables<"commercial_signups"> {
  restaurant: { name: string; address: string | null };
  commercial: { first_name: string | null; email: string; discord_user_id: string | null };
}

/** L'inscription d'un jeton, tant que son commercial est sous contrat. */
export async function getSignup(admin: Admin, id: string): Promise<Signup> {
  const { data } = await admin
    .from("commercial_signups")
    .select("*, restaurant:crm_restaurants(name, address), commercial:commerciaux(first_name, email, discord_user_id, ended_at)")
    .eq("id", id)
    .maybeSingle();
  if (!data) throw new SignupError("Ce lien d’inscription n’existe pas.", 404);
  if (data.commercial.ended_at && data.commercial.ended_at <= new Date().toISOString()) {
    throw new SignupError("Ce lien d’inscription n’est plus valable.", 410);
  }
  return data as unknown as Signup;
}

const linkState = (done: boolean, later: boolean): LinkState => (done ? "done" : later ? "later" : "todo");

/** Stripe n'est interrogé qu'une fois le compte créé : avant, il n'y a rien à relire. */
export async function signupProgress(admin: Admin, stripe: () => Stripe, signup: Signup): Promise<SignupProgress> {
  const etablissementId = signup.etablissement_id;
  const [stripeStatus, { count: hubrise }] = etablissementId
    ? await Promise.all([
        connectStatus(admin, stripe(), etablissementId),
        admin.from("hubrise_connections").select("etablissement_id", { count: "exact", head: true }).eq("etablissement_id", etablissementId),
      ])
    : [{ chargesEnabled: false }, { count: 0 }];
  return {
    restaurant: signup.restaurant.name,
    accountCreated: etablissementId !== null,
    stripe: linkState(stripeStatus.chargesEnabled, signup.stripe_later),
    hubrise: linkState((hubrise ?? 0) > 0, signup.hubrise_later),
    photos: signup.photos.length,
    finished: signup.finished_at !== null,
  };
}

/** Un client authentifié comme le gérant, le temps des fonctions qui lisent auth.uid(). */
async function signedInAs(email: string, password: string) {
  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return client;
}

/*
 * Le compte du gérant, confirmé d'office, puis son établissement (offre
 * unique), les réponses du composeur et l'accord aux CGV : le même chemin
 * que l'inscription seule, sans paiement. Le gérant reçoit un e-mail.
 */
export async function createSignupAccount(admin: Admin, signup: Signup, input: SignupAccountInput, request: Request) {
  if (signup.etablissement_id) throw new SignupError("Le compte de ce restaurant est déjà créé.", 409);
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || input.password.length < 6 || !name) throw new SignupError("E-mail, mot de passe (6 caractères au moins) et nom du restaurant sont obligatoires.", 400);
  if (!SIGNUP_KINDS.some((kind) => kind.id === input.kind)) throw new SignupError("Type d’établissement inconnu.", 400);
  if (!input.managerName.trim() || (!input.managerPhone.trim() && !input.managerEmail.trim())) {
    throw new SignupError("Le nom du responsable et son téléphone (ou son e-mail) sont obligatoires.", 400);
  }
  const versions = assertVersionsMatch(input.versions);

  const { data: created, error: userError } = await admin.auth.admin.createUser({ email, password: input.password, email_confirm: true });
  if (userError) {
    throw new SignupError(
      userError.code === "email_exists" ? "Un compte Ominin existe déjà avec cet e-mail." : userError.message,
      409
    );
  }
  // Une étape qui échoue retire ce qui a été créé : le gérant peut recommencer
  // avec le même e-mail.
  let etablissementId: string | null = null;
  try {
    const gerant = await signedInAs(email, input.password);
    // Adresse du menu tirée du nom ; prise, elle reçoit la marque de l'inscription.
    const base = slugify(name) || signup.id.slice(0, 6);
    for (const slug of [base, `${base}-${signup.id.slice(0, 6)}`]) {
      const { data, error } = await gerant.rpc("create_etablissement", {
        p_name: name,
        p_slug: slug,
        p_offre: "connect",
        p_table_count: input.setup.tables,
        p_address: signup.restaurant.address ?? "",
      });
      if (!error) {
        etablissementId = data;
        break;
      }
      if (error.code !== "23505") throw new Error(error.message);
    }
    if (!etablissementId) throw new Error("Aucune adresse de menu libre pour ce nom.");

    const { error: setupError } = await gerant.rpc("save_starter_setup", {
      p_etablissement_id: etablissementId,
      p_setup: input.setup as unknown as Json,
    });
    if (setupError) throw new Error(setupError.message);

    await acceptContract(admin, {
      userId: created.user.id,
      signatoryEmail: email,
      scope: { kind: "etablissement", id: etablissementId, label: base },
      terms: { context: "onboarding", versions },
      request,
    });
  } catch (cause) {
    if (etablissementId) await admin.from("etablissements").delete().eq("id", etablissementId);
    await admin.auth.admin.deleteUser(created.user.id);
    throw cause;
  }

  const { error } = await admin
    .from("commercial_signups")
    .update({
      etablissement_id: etablissementId,
      kind: input.kind,
      manager_name: input.managerName.trim(),
      manager_phone: input.managerPhone.trim() || null,
      manager_email: input.managerEmail.trim().toLowerCase() || null,
    })
    .eq("id", signup.id);
  if (error) throw new Error(error.message);

  await sendEmail(
    email,
    "Votre compte Ominin est créé",
    card(
      "Bienvenue chez Ominin.",
      `Votre compte est cr&eacute;&eacute; pour ${escapeHtml(name)}. Notre &eacute;quipe pr&eacute;pare maintenant votre menu&nbsp;: votre espace de gestion affiche &laquo;&nbsp;Votre menu est en cr&eacute;ation&nbsp;&raquo; jusqu&rsquo;&agrave; ce qu&rsquo;il soit pr&ecirc;t.`,
      { label: "Ouvrir mon espace", url: `${menuSiteUrl}/gestion` },
      `Connectez-vous avec cette adresse e-mail et le mot de passe choisi pendant l&rsquo;inscription.`
    ),
    contactEmail
  ).catch((cause) => console.error("[inscription] e-mail de bienvenue non envoyé", cause));
}

/*
 * Fin du questionnaire : le restaurant entre dans Projet, ses réponses
 * partent dans #inscriptions, et l'annonce dans #victoires s'il est complet
 * (Stripe, HubRise ; le contact est obligatoire), sinon dans #terrain.
 */
export async function finishSignup(admin: Admin, signup: Signup, progress: SignupProgress) {
  if (!signup.etablissement_id) throw new SignupError("Le compte du restaurant n’est pas encore créé.", 409);
  if (signup.finished_at) return;
  const complete = progress.stripe === "done" && progress.hubrise === "done";
  const now = new Date().toISOString();

  const { error } = await admin.from("commercial_signups").update({ finished_at: now }).eq("id", signup.id).is("finished_at", null);
  if (error) throw new Error(error.message);
  const { error: projetError } = await admin.rpc("projet_add_client", {
    p_name: signup.restaurant.name,
    p_product: "menu",
    p_etablissement: signup.etablissement_id,
    p_restaurant: signup.restaurant_id,
  });
  if (projetError) console.error("[inscription] client Projet non créé", projetError.message);
  if (complete) {
    await admin.from("crm_restaurants").update({ etablissement_id: signup.etablissement_id }).eq("id", signup.restaurant_id);
  }

  const commercial = signup.commercial.first_name ?? signup.commercial.email;
  const restaurant = signup.restaurant.name;
  const missing = [progress.stripe !== "done" && "Stripe", progress.hubrise !== "done" && "HubRise"].filter(Boolean).join(" et ");
  const { data: setup } = await admin.from("starter_setups").select("answers").eq("etablissement_id", signup.etablissement_id).maybeSingle();
  const answers = parseAnswers(setup?.answers);
  const kind = SIGNUP_KINDS.find((entry) => entry.id === signup.kind)?.label;
  const details = [
    `📋 **${restaurant}** inscrit par ${commercial}`,
    `Type : ${kind ?? "?"}`,
    `Responsable : ${signup.manager_name} · ${[signup.manager_phone, signup.manager_email].filter(Boolean).join(" · ")}`,
    `Stripe : ${progress.stripe === "done" ? "branché" : "à faire"} · HubRise : ${progress.hubrise === "done" ? "branché" : "à faire"} · Photos du menu : ${progress.photos}`,
    ...(answers ? [...describeAnswers(answers).map(([label, value]) => `• ${label} : ${value}`), ...compose(answers).notes.map((note) => `• ${note.text}`)] : []),
  ].join("\n");

  const posts: Promise<void>[] = [postDiscord("inscriptions", details)];
  posts.push(
    complete
      ? postDiscord("victoires", `🎉 **${restaurant}** a signé avec ${commercial}. Bravo !`)
      : postDiscord("terrain", `${commercial} a inscrit ${restaurant} : il reste ${missing} à finir.`)
  );
  for (const result of await Promise.allSettled(posts)) {
    if (result.status === "rejected") console.error("[discord] inscription non annoncée", result.reason);
  }
}
