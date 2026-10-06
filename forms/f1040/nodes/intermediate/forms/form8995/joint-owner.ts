import {
  allocateSharedSeDeduction,
  roundSignedQbiDollars,
} from "../../../inputs/schedule_c/qbi-multiple.ts";
import { ownedScheduleSE } from "../schedule_se/owner-calculation.ts";

/** Attribute each proprietor's own SE deduction before joint-return QBI netting. */
export function jointOwnerQbi(
  rawSource: unknown,
  taxableIncomeBefore: number,
  ssWageBase: number,
) {
  const owned = ownedScheduleSE(rawSource, ssWageBase);
  const source = owned.source;
  if (
    source.businesses.some((row) =>
      !row.business_name || row.qbi_no_other_adjustments_confirmed !== true ||
      row.farm_optional_method_elected === true
    )
  ) {
    throw new Error(
      "Joint owner QBI needs identified ordinary businesses with reviewed attributable adjustments",
    );
  }
  const allocations = source.businesses.map(() => 0);
  for (const recipient of ["T", "S"] as const) {
    const indices = source.businesses.flatMap((row, i) =>
      row.recipient === recipient ? [i] : []
    );
    const deduction = owned.instances.find((row) =>
      row.recipient === recipient
    )?.line13 ?? 0;
    const shares = allocateSharedSeDeduction(
      indices.map((i) => source.businesses[i].net_profit),
      deduction,
    );
    indices.forEach((index, position) => {
      allocations[index] = shares[position];
    });
  }
  const rows = source.businesses.map((row, index) => {
    const rawQbi = row.net_profit - allocations[index];
    return {
      business_reference: row.source_reference,
      business_name: row.business_name!,
      recipient: row.recipient,
      tin: {
        kind: row.ein ? "ein" as const : "ssn" as const,
        value: row.ein ??
          (row.recipient === "T"
            ? source.identity.primary_ssn
            : source.identity.spouse_ssn),
      },
      raw_qbi: rawQbi,
      qbi: roundSignedQbiDollars(rawQbi),
      se_tax_deduction: allocations[index],
    };
  });
  const line2 = rows.reduce((sum, row) => sum + row.qbi, 0);
  const line4 = Math.max(0, line2), line5 = Math.round(line4 * .2);
  const line11 = Math.round(Math.max(0, taxableIncomeBefore));
  const line14 = Math.round(line11 * .2);
  return {
    joint_owner_filing_rows: rows,
    line2,
    line3: 0,
    line4,
    line5,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: line5,
    line11,
    line12: 0,
    line13: line11,
    line14,
    line15: Math.min(line5, line14),
    line16: Math.max(0, -line2),
    line17: 0,
  };
}
