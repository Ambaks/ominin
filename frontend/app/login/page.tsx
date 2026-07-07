import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion — Ominin",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { error, plan } = await searchParams;
  return (
    <LoginForm
      authError={error === "auth"}
      plan={typeof plan === "string" ? plan : undefined}
    />
  );
}
