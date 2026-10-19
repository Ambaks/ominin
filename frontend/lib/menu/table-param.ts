/**
 * Le numéro de table d'un QR (?table=) : des chiffres seulement, quatre au
 * plus — « 1e3 » ne devient pas la table 1000, un nombre sans fin n'atteint
 * pas la base ; un QR imprimé « 07 » reste la table 7. null sinon.
 */
export function tableParam(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const table = value && /^\d{1,4}$/.test(value) ? Number(value) : 0;
  return table > 0 ? table : null;
}
