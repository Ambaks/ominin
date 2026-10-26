import { NextResponse, type NextRequest } from "next/server";
import type { MonthLine, Statement } from "@/lib/commercial/api";
import { statementCsv, statementFilename, statementPdf } from "@/lib/commercial/statement";
import { createClient } from "@/lib/supabase/server";

/*
 * Un relevé en PDF (ou en CSV : ?format=csv), lu sous RLS : son commercial
 * (relevés envoyés seulement) ou un admin (brouillons compris).
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/commercial/releves/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commercial_statements")
    .select("month, lines, adjustments, total_cents, sent_at, commerciaux(email, first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Relevé introuvable." }, { status: 404 });

  const statement = data as unknown as Pick<Statement, "month" | "adjustments" | "total_cents" | "sent_at"> & {
    lines: MonthLine[];
  };
  if (request.nextUrl.searchParams.get("format") === "csv") {
    return new Response(statementCsv(statement.lines), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="releve-${statement.month.slice(0, 7)}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  const who = data.commerciaux;
  const name = [who?.first_name, who?.last_name].filter(Boolean).join(" ") || (who?.email ?? "");
  return new Response(new Uint8Array(await statementPdf(statement, name)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${statementFilename(statement.month)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
