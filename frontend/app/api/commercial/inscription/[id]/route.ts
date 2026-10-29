import { NextResponse } from "next/server";
import { SignupError, getSignup, signupProgress } from "@/lib/commercial/signup";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* L'avancement d'une inscription, lu par le questionnaire et suivi en direct par le commercial. */
export async function GET(_request: Request, { params }: RouteContext<"/api/commercial/inscription/[id]">) {
  const { id } = await params;
  const admin = createAdminClient();
  try {
    return NextResponse.json(await signupProgress(admin, getStripe(), await getSignup(admin, id)));
  } catch (cause) {
    if (cause instanceof SignupError) return NextResponse.json({ error: cause.message }, { status: cause.status });
    throw cause;
  }
}
