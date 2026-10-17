/**
 * IRS "Standard Postal Service State Abbreviations and ZIP Codes"
 * (irs.gov/pub/irs-utl/zip_code_and_state_abbreviations.pdf), the list Pub 4164
 * §13.8 cites. "nn" ranges are written as three-digit prefixes.
 */
const RANGES: Readonly<Record<string, string>> = {
  AL: "350-352,354-369",
  AK: "995-999",
  // The list prints "859nn-850nn"; 859-860 is the Arizona range it means.
  AZ: "850-853,855-857,859-860,863-865",
  AR: "716-729",
  CA: "900-908,910-928,930-961",
  CO: "800-816",
  CT: "060-06389,06391-069",
  DE: "197-199",
  DC: "200,202-205,569",
  FL: "320-339,341,342,344,346,347,349",
  GA: "300-319,398-399",
  HI: "967,968",
  ID: "832-838",
  IL: "600-620,622-629",
  IN: "460-479",
  IA: "500-516,520-528",
  KS: "660-662,664-679",
  KY: "400-427",
  LA: "700-701,703-708,710-714",
  ME: "039-049",
  MD: "206-212,214-219",
  MA: "010-027,055",
  MI: "480-499",
  MN: "550-551,553-567",
  MS: "386-397",
  MO: "630-631,633-641,644-658",
  MT: "590-599",
  NE: "680-681,683-693",
  NV: "889-891,893-895,897-898",
  NH: "030-038",
  NJ: "070-089",
  NM: "870-871,873-875,877-884",
  NY: "005,06390,100-149",
  NC: "270-289",
  ND: "580-588",
  OH: "430-459",
  OK: "730-731,734-741,743-749",
  OR: "970-979",
  PA: "150-196",
  RI: "028,029",
  SC: "290-299",
  SD: "570-577",
  TN: "370-385",
  TX: "733,750-770,772-799",
  UT: "840-847",
  VT: "050-054,056-059",
  VA: "201,220-246",
  WA: "980-986,988-994",
  WV: "247-268",
  WI: "530-532,534-535,537-549",
  WY: "820-831,834",
  AS: "96799",
  FM: "969",
  GU: "969",
  MH: "969",
  MP: "969",
  PW: "969",
  PR: "006-007,009",
  VI: "008",
  AA: "340",
  AE: "090-098",
  AP: "962-966",
};

/** A three-digit prefix spans its 100 ZIP codes; a five-digit code is itself. */
function bounds(code: string, end: boolean): number {
  if (code.length === 5) return Number(code);
  return Number(code) * 100 + (end ? 99 : 0);
}

/** Whether the first five digits of `zip` are valid for the state per the IRS list. */
export function zipMatchesState(zip: string, state: string): boolean {
  const ranges = RANGES[state];
  if (ranges === undefined) return true;
  const five = Number(zip.replace(/\D/g, "").slice(0, 5));
  return ranges.split(",").some((range) => {
    const [lo, hi = lo] = range.split("-");
    return five >= bounds(lo, false) && five <= bounds(hi, true);
  });
}
