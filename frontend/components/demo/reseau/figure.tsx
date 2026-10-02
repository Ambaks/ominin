/**
 * Un chiffre et son unité, plus petite et en retrait : « 248 € », « 11 min ».
 * `approx` le fait précéder d'un « ≈ » discret, dans la police du texte.
 */
export function Figure({ value, unit, approx }: { value: React.ReactNode; unit?: string; approx?: boolean }) {
  return (
    <>
      {approx && <span className="mr-1 font-sans text-[0.6em] text-muted">≈</span>}
      {value}
      {unit && <span className="ml-1 text-[0.6em] text-muted">{unit}</span>}
    </>
  );
}
