"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/field";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/admin/social";
import type { SocialAccount } from "@/lib/admin/social";
import {
  BRANDS,
  PLATFORMS,
  type Brand,
  type SocialPlatform,
} from "@/lib/social/brands";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from "./styles";

/*
 * Grille marque × réseau. Instagram et Facebook se relient d'un seul geste
 * (une autorisation Meta couvre toutes les Pages), puis chaque compte
 * découvert se rattache à sa marque. Snapchat se déclare à la main. X est
 * affiché pour mémoire : son API est payante à l'usage, branchée plus tard.
 */
export function AccountsTab({
  accounts,
  onChange,
}: {
  accounts: SocialAccount[];
  onChange: () => void;
}) {
  const run = useRunMutation();
  const unassigned = accounts.filter((account) => account.brand === null);
  const hasMeta = accounts.some((account) => account.platform !== "snapchat");

  const connectMeta = () =>
    void run(async () => {
      window.location.assign(await api.startMetaConnect());
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">Instagram &amp; Facebook</p>
          <p className="mt-0.5 text-sm text-muted">
            Une seule autorisation Meta relie toutes les Pages Facebook
            d&apos;Ominin et les comptes Instagram professionnels qui leur sont
            liés.
          </p>
        </div>
        <button type="button" onClick={connectMeta} className={PRIMARY_BUTTON}>
          {hasMeta ? "Actualiser la connexion Meta" : "Connecter Meta"}
        </button>
      </div>

      {unassigned.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-ember-2/30 bg-ember-2/5 p-4">
          <p className={`${SECTION_TITLE} text-ember-2`}>À rattacher</p>
          {unassigned.map((account) => (
            <div key={account.id} className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="text-muted">
                  {PLATFORMS.find((p) => p.id === account.platform)?.label}{" "}
                  ·{" "}
                </span>
                {account.handle}
              </span>
              <select
                className={`${inputClass} w-auto`}
                defaultValue=""
                onChange={(event) => {
                  const brand = event.target.value as Brand["id"];
                  void run(async () => {
                    await api.assignAccountBrand(account.id, brand);
                    onChange();
                  }, "Compte rattaché.");
                }}
              >
                <option value="" disabled>
                  Choisir la marque…
                </option>
                {BRANDS.filter(
                  (brand) =>
                    !accounts.some(
                      (other) =>
                        other.brand === brand.id &&
                        other.platform === account.platform,
                    ),
                ).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {BRANDS.map((brand) => (
          <div
            key={brand.id}
            className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4"
          >
            <div>
              <p className="font-display text-lg font-medium">{brand.name}</p>
              <p className="text-xs text-faint">{brand.url}</p>
            </div>
            {PLATFORMS.map((platform) => (
              <AccountRow
                key={platform.id}
                brand={brand}
                platform={platform.id}
                label={platform.label}
                account={
                  accounts.find(
                    (account) =>
                      account.brand === brand.id &&
                      account.platform === platform.id,
                  ) ?? null
                }
                onChange={onChange}
              />
            ))}
            <div className="flex items-center gap-3 border-t border-hairline pt-3 text-sm">
              <span className="w-24 shrink-0 text-muted">X</span>
              <span className="text-faint">
                Plus tard — API payante à l&apos;usage
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountRow({
  brand,
  platform,
  label,
  account,
  onChange,
}: {
  brand: Brand;
  platform: SocialPlatform;
  label: string;
  account: SocialAccount | null;
  onChange: () => void;
}) {
  const run = useRunMutation();
  const [handle, setHandle] = useState("");

  if (!account) {
    return (
      <div className="flex items-center gap-3 border-t border-hairline pt-3 text-sm">
        <span className="w-24 shrink-0 text-muted">{label}</span>
        {platform === "snapchat" ? (
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const value = handle.trim().replace(/^@/, "");
              if (!value) return;
              void run(async () => {
                await api.addSnapchatAccount(brand.id, value);
                setHandle("");
                onChange();
              }, "Compte Snapchat déclaré.");
            }}
          >
            <input
              className={`${inputClass} min-w-0 flex-1`}
              placeholder="Nom du compte"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
            />
            <button type="submit" className={SECONDARY_BUTTON}>
              Déclarer
            </button>
          </form>
        ) : (
          <span className="text-faint">Non relié</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-3 text-sm">
      <span className="w-24 shrink-0 text-muted">{label}</span>
      {/* Largeur plancher : faute de place, les boutons passent à la ligne
          plutôt que de tronquer le nom du compte. */}
      <span className="min-w-40 flex-1 truncate font-medium">
        {/* Une Page Facebook porte un nom, pas un identifiant. */}
        {platform === "facebook" ? "" : "@"}
        {account.handle}
        {platform === "snapchat" && (
          <span className="ml-2 text-xs font-normal text-faint">
            publication manuelle
          </span>
        )}
        {!account.enabled && (
          <span className="ml-2 text-xs font-normal text-ember-2">
            en pause
          </span>
        )}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            void run(
              async () => {
                await api.setAccountEnabled(account.id, !account.enabled);
                onChange();
              },
              account.enabled
                ? "Compte en pause : l'agent n'y publie plus."
                : "Compte réactivé.",
            )
          }
          className={SECONDARY_BUTTON}
        >
          {account.enabled ? "Mettre en pause" : "Réactiver"}
        </button>
        {platform === "snapchat" ? (
          <button
            type="button"
            onClick={() => {
              // La suppression emporte les stories déjà préparées pour ce compte.
              if (
                !window.confirm(
                  `Retirer @${account.handle} et son historique ?`,
                )
              ) {
                return;
              }
              void run(async () => {
                await api.removeAccount(account.id);
                onChange();
              }, "Compte Snapchat retiré.");
            }}
            className={SECONDARY_BUTTON}
          >
            Retirer
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              void run(async () => {
                await api.assignAccountBrand(account.id, null);
                onChange();
              }, "Compte détaché de la marque.")
            }
            className={SECONDARY_BUTTON}
          >
            Détacher
          </button>
        )}
      </div>
    </div>
  );
}
