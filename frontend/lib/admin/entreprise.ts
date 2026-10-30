import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";

/* Prestataires, échéances et documents de l'entreprise. */

export type Vendor = Tables<"company_vendors">;
export type VendorInput = TablesInsert<"company_vendors">;
export type Deadline = Tables<"company_deadlines">;
export type DeadlineInput = TablesInsert<"company_deadlines">;
export type CompanyDocument = Tables<"company_documents">;
export type CompanyDocumentInput = TablesInsert<"company_documents">;

export async function fetchVendors(): Promise<Vendor[]> {
  return createClient()
    .from("company_vendors")
    .select("*")
    .order("name", { ascending: true })
    .then(must);
}

export async function saveVendor(id: string | null, input: VendorInput): Promise<void> {
  const table = createClient().from("company_vendors");
  check(await (id ? table.update(input).eq("id", id) : table.insert(input)));
}

export async function deleteVendor(id: string): Promise<void> {
  check(await createClient().from("company_vendors").delete().eq("id", id));
}

export async function fetchDeadlines(): Promise<Deadline[]> {
  return createClient()
    .from("company_deadlines")
    .select("*")
    .is("done_at", null)
    .order("due_on", { ascending: true })
    .then(must);
}

export async function saveDeadline(id: string | null, input: DeadlineInput): Promise<void> {
  const table = createClient().from("company_deadlines");
  check(await (id ? table.update(input).eq("id", id) : table.insert(input)));
}

export async function deleteDeadline(id: string): Promise<void> {
  check(await createClient().from("company_deadlines").delete().eq("id", id));
}

export async function fetchDocuments(): Promise<CompanyDocument[]> {
  return createClient()
    .from("company_documents")
    .select("*")
    .order("title", { ascending: true })
    .then(must);
}

export async function saveDocument(
  id: string | null,
  input: CompanyDocumentInput
): Promise<void> {
  const table = createClient().from("company_documents");
  check(await (id ? table.update(input).eq("id", id) : table.insert(input)));
}

export async function deleteDocumentRow(id: string): Promise<void> {
  check(await createClient().from("company_documents").delete().eq("id", id));
}
