import type { FilerIdentity } from "../../../../../mef/header.ts";
import {
  calculateCategory5Inclusions,
  inputSchema,
} from "../../../../../nodes/inputs/general/foreign/f5471/index.ts";

type Pending = Readonly<Record<string, unknown>>;

export function projectForm8992Source(
  pending: Pending,
  filer?: FilerIdentity,
) {
  const raw = pending.f5471;
  if (raw === undefined) {
    throw new Error("Form 8992 needs its Category 5a Form 5471 source");
  }
  const { f5471s: [cfc] } = inputSchema.parse(raw);
  const calculation = calculateCategory5Inclusions(cfc);
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  if (
    schedule1?.line8n_section951a_inclusion !==
      (calculation.section951a > 0 ? calculation.section951a : undefined) ||
    schedule1?.line8o_section951aa_inclusion !==
      (calculation.gilti > 0 ? calculation.gilti : undefined)
  ) {
    throw new Error(
      "Form 8992 source does not match Schedule 1 lines 8n and 8o",
    );
  }
  let shareholderName: string | undefined;
  if (filer) {
    const primary = filer.primarySSN.replaceAll("-", "");
    const spouse = filer.spouse?.ssn.replaceAll("-", "");
    if (cfc.shareholder_tin === primary) {
      shareholderName = [filer.firstName, filer.middleInitial, filer.lastName]
        .filter(Boolean).join(" ");
    } else if (cfc.shareholder_tin === spouse) {
      shareholderName = [
        filer.spouse?.firstName,
        filer.spouse?.middleInitial,
        filer.spouse?.lastName,
      ].filter(Boolean).join(" ");
    } else {
      throw new Error("Form 8992 shareholder TIN differs from return filer");
    }
    if (
      cfc.owned_worksheet_source &&
      cfc.owned_worksheet_source.shareholder_name !== shareholderName
    ) {
      throw Error(
        "Owned CFC stock/source shareholder legal name differs from return filer",
      );
    }
    if (cfc.owned_worksheet_source) {
      const address =
        cfc.owned_worksheet_source.interest_apportionment_election_prerequisite
          .controlling_shareholder_address;
      if (
        Object.entries(address).some(([key, value]) =>
          filer.address[key as keyof typeof address] !== value
        )
      ) {
        throw Error(
          "Constructed controlling-shareholder election address differs from return filer; consent and timely filing remain unverified",
        );
      }
    }
    if (
      !shareholderName || shareholderName.length > 35 ||
      !/^([A-Za-z0-9'-] ?)*[A-Za-z0-9'-]$/.test(shareholderName)
    ) {
      throw new Error("Form 8992 needs the shareholder's legal name");
    }
  }
  return { cfc, calculation, shareholderName };
}
