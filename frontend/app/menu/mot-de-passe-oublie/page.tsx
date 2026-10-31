import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/password-reset";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Ominin",
  robots: { index: false, follow: false },
};

export default function MotDePasseOubliePage() {
  return <ForgotPasswordForm />;
}
