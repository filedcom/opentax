import { type FilerIdentity } from "../../../../../mef/header.ts";
import { form4852CalculationSources } from "../../../../../nodes/inputs/income/wages/f4852/index.ts";
import { reconcileForm4852Source } from "./form4852_source.ts";

/** Derive transmitted sources only; never feed these copies back into calculation. */
export function form4852NativeSources(
  pending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
) {
  if (!pending?.f4852) return { w2s: [], f1099rs: [] };
  if (!filer) {
    throw new Error("Form 4852 native sources require filer identity");
  }
  const { f4852s } = reconcileForm4852Source(pending, filer);
  const projected = form4852CalculationSources(f4852s);
  if (projected.f1099rs.length && filer.address.foreignCountry) {
    throw new Error(
      "Form 4852 retirement native copies require actual supported recipient address fields",
    );
  }
  return {
    w2s: projected.w2s,
    f1099rs: projected.f1099rs.map((item) => ({
      ...item,
      recipient_address_line1: filer.address.line1,
      recipient_address_city: filer.address.city,
      recipient_address_state: filer.address.state,
      recipient_address_zip: filer.address.zip,
    })),
  };
}
