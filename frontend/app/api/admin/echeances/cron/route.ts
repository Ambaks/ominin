import { NextResponse } from "next/server";
import { DEADLINE_REMINDER_DAYS } from "@/lib/admin/constants";
import { daysUntil, formatDueDate } from "@/lib/admin/echeances";
import { OWNERS } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Rappels du matin (workflow company-deadlines) : les échéances, fins de
 * validité et renouvellements qui tombent à l'une des distances réglées. Rien
 * à mémoriser : un jour donné, une date n'est qu'à une seule distance.
 */

const parisDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  const db = createAdminClient();
  const [deadlines, documents, vendors] = await Promise.all([
    db.from("company_deadlines").select("title, due_on").is("done_at", null),
    db.from("company_documents").select("title, expires_on").not("expires_on", "is", null),
    db.from("company_vendors").select("name, renewal_on").not("renewal_on", "is", null),
  ]);
  const failure = deadlines.error ?? documents.error ?? vendors.error;
  if (failure) return NextResponse.json({ error: failure.message }, { status: 500 });

  const items = [
    ...(deadlines.data ?? []).map((row) => ({ label: row.title, date: row.due_on })),
    ...(documents.data ?? []).map((row) => ({
      label: `${row.title} expire`,
      date: row.expires_on as string,
    })),
    ...(vendors.data ?? []).map((row) => ({
      label: `Renouvellement ${row.name}`,
      date: row.renewal_on as string,
    })),
  ];
  const today = parisDay.format(new Date());
  const due = items.filter((item) =>
    DEADLINE_REMINDER_DAYS.includes(daysUntil(item.date, today))
  );
  for (const item of due) {
    await notifyOwners(OWNERS, {
      title: item.label,
      body: item.date === today ? "C'est aujourd'hui." : `Pour le ${formatDueDate(item.date)}.`,
      tag: `echeance-${item.label}-${item.date}`,
      url: "/echeances",
    });
  }
  return NextResponse.json({ reminded: due.length });
}
