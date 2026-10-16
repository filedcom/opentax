import * as fs from "node:fs/promises";
// Synthetic joint returns retain the original issuer's complete statement bytes.
export const jointRpeCases = [
  {
    name: "primary-four-phase",
    owner: "T",
    count: 4,
    wages: 100000,
    deduction: 69104,
  },
  {
    name: "spouse-four-phase",
    owner: "S",
    count: 4,
    wages: 100000,
    deduction: 69104,
  },
  {
    name: "primary-four-full",
    owner: "T",
    count: 4,
    wages: 200000,
    deduction: 66250,
  },
  {
    name: "spouse-four-full",
    owner: "S",
    count: 4,
    wages: 200000,
    deduction: 66250,
  },
  {
    name: "primary-three-phase",
    owner: "T",
    count: 3,
    wages: 230000,
    deduction: 48000,
  },
  {
    name: "spouse-three-phase",
    owner: "S",
    count: 3,
    wages: 230000,
    deduction: 48000,
  },
] as const;
export async function jointRpeFixture(c: typeof jointRpeCases[number]) {
  const input = JSON.parse(
    await fs.readFile(
      new URL(
        `./form8995a-rpe-${c.count}-business-source.json`,
        import.meta.url,
      ), "utf8",
    ),
  );
  const primary = c.owner === "T";
  Object.assign(input.general, {
    filing_status: "mfj",
    taxpayer_first_name: primary ? "Alex" : "Sam",
    taxpayer_last_name: primary ? "Taxpayer" : "Example",
    taxpayer_ssn: primary ? "123-45-6789" : "111-22-3333",
    spouse_first_name: primary ? "Sam" : "Alex",
    spouse_last_name: primary ? "Example" : "Taxpayer",
    spouse_ssn: primary ? "111-22-3333" : "123-45-6789",
    spouse_dob: "1985-06-15",
  });
  input.w2[0].box1_wages = c.wages - 10000;
  for (const [i, wage] of input.w2.entries()) {
    Object.assign(wage, {
      source_document_reference: `synthetic-${c.name}-w2-${i}`,
      box3_ss_wages: Math.min(wage.box1_wages, 176100),
      box4_ss_withheld: Math.round(Math.min(wage.box1_wages, 176100) * 6.2) /
        100,
      box5_medicare_wages: wage.box1_wages,
      box6_medicare_withheld: Math.round(
        (wage.box1_wages * .0145 +
          Math.max(0, wage.box1_wages - 200000) * .009) * 100,
      ) / 100,
    });
  }
  return input;
}
