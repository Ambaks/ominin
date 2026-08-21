"use client";

import { useState } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";

type Profile = "owner" | "staff";

const TABS: { value: Profile; label: string }[] = [
  { value: "owner", label: "Propriétaire" },
  { value: "staff", label: "Membre d'équipe" },
];

function ProfileTabs({
  value,
  onChange,
}: {
  value: Profile;
  onChange: (v: Profile) => void;
}) {
  return (
    <div className="flex w-full max-w-sm rounded-xl border border-hairline bg-surface p-1">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            value === tab.value
              ? "ember-gradient text-background"
              : "text-muted hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function InscriptionTabs({
  chosenPlan,
  authError,
}: {
  chosenPlan?: string;
  authError: boolean;
}) {
  const [profile, setProfile] = useState<Profile>("owner");

  const destination =
    profile === "owner" && chosenPlan
      ? `/onboarding?plan=${encodeURIComponent(chosenPlan)}`
      : "/onboarding";

  return (
    <AuthForm
      brand={<Wordmark className="text-2xl" />}
      space="Espace restaurants"
      destination={destination}
      mode="signup"
      otherHref="/connexion"
      subtitle={
        profile === "owner"
          ? "Gérez votre restaurant avec Ominin."
          : "Créez votre accès pour rejoindre l'équipe."
      }
      signUpData={profile === "staff" ? { profile: "staff" } : undefined}
      authError={authError}
      beforeCard={<ProfileTabs value={profile} onChange={setProfile} />}
    />
  );
}
