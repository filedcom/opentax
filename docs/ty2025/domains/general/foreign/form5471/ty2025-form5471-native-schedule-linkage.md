# TY2025 Category4/5a native schedule linkage

The reviewed sole direct owner now receives a native Form5471 parent reference
to each actual required separate Schedule E/E1, H, I1, J, M, P, Q and R. The
builder's discovery pass finds document IDs; its final pass must provide exactly
one ID per required pending key and matching IRS root. Missing, duplicate and
conflicting inventories reject. The parent XSD fixes referenceDocumentName to its
full permitted list, so the native attribute preserves that exact list rather
than shortening it to the eight attached roots.

The final document-integrity gate independently checks all eight references and
each schedule's shareholder SSN and foreign corporation EIN/reference ID against
the parent. Parent-to-schedule is the correct direction: canonical v5.4
IRS5471.xsd permits the references, while ScheduleR has no reference attributes.
Both reference-ID-only and EIN-only actual source projections pass. No tax,
source amount, distributions or PDF mappings changed in this repair.

## Executed evidence

- Focused typed5/0: `/tmp/opentax-form5471-native-links-source-terminal-v5.log`.
  Includes94 negative assertion paths:50 inventory and44 final native
  reference/identity conflicts. Linked parent validates against canonical v5.4
  XSD. Removing only the two intended reference attributes leaves the original
  source-projected parent XML byte-identical.
- Native/source/generic-reference compatibility192/0:
  `/tmp/opentax-form5471-native-links-compat-v1.log`.
- Paper/8992 compatibility13/0:
  `/tmp/opentax-form5471-native-links-paper-8992-compat-v1.log`.
- Public native/PDF attachment/export guard12/0:
  `/tmp/opentax-form5471-native-links-export-guard-v1.log`.
  Full positive export remains rejected.

Source/native inventory:
`/tmp/opentax-form5471-native-links-evidence-terminal-v5` contains the retained
source pending graph, linked parent, nine actual native fragments and document
inventories. These are authored diagnostic projections, not accepted filings.

Actual retained-source standalone PDF replay:
`/tmp/opentax-form5471-native-links-pdf-retained-v1`, eleven diagnostic documents,
27pages. All11 field projection JSON files are exact and all27 decoded page
rasters match the previously completed root review at
`/tmp/opentax-5471-8992-template-audit-final-v2-oct6`. No changed visual pages are
claimed. Selected-page diagnostic wrappers have new-document metadata; PDF byte
identity is not asserted. Review transfer manifest SHA256:
`53c7a60c538026346275ede4e95120c44691fa26361c3eabbb3f473634bff106`.
The actual paper-zero R descriptor from root patch fc9d24ffb is preserved: both
amount cells0, blank date, no native dated distribution group.

Repeat the native proof from an isolated checkout with local docs read-cache:

```
FORM5471_LINKAGE_EVIDENCE_DIR=<fresh-output> PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno test -A forms/f1040/2025/mef/forms/general/foreign/f5471/f5471-linkage.test.ts
```

The retained-source PDF replay script is
`.state/research/form5471-native-links/audit.ts` in the isolated proof checkout;
it reads the retained source-pending.json rather than regenerating issuer facts.
Outside raster comparison script:
`/tmp/opentax-form5471-native-links-compare-pdf.py`.
Historical v1 negative-test failure was an unchanged EIN mutation on an actual
reference-ID-only source; it was corrected to insert a genuinely conflicting
EIN and assert the XML changed. Historical v3 tuple typecheck failure is retained.
Neither failed log is called green.

## Required evidence still unavailable

No verified current or v3.0 business-rule package was found in local caches or
obtained from the official public pages. An earlier prose assertion about
SR-F5471-001/002 has no verified package provenance in this session and is not the
authority for this repair. This implementation follows the actual local v5.4 XSD
and source-bound document inventory; it does not establish business-rule or ATS
acceptance.

The [IRS v5.4 release memo](https://www.irs.gov/e-file-providers/release-memo-for-tax-year-2025-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-version-5-point-4)
(May28,2026) distributes the package through registered e-Services/SOR. The
[official effective-date table](https://www.irs.gov/tax-professionals/tax-year-2025-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions)
read October6,2026 lists v5.4 ATS October13,2026 and production TBD; v5.7 is also
listed with ATS November1,2026 and production TBD. Neither local structural XSD
success nor an old rule summary proves the applicable submission-date rules.
Captured official HTML bytes and SHA256 are in
`/tmp/opentax-form5471-native-links-official-provenance`:
release `178c5233d70ef2310782fda8d4451bdab7713a5df759c152ceb8c96073373fb9`,
dates `f91fca7382b6df9f110f2e028b66e6229ffb92572a58e008ade1009f159a2a39`.
These hashes identify release notices, not business-rule packages.

Current required all-zero native ScheduleR treatment still needs current rule
text and IRS-approved guidance/accepted evidence; no dated distribution may be
invented. December2025 ScheduleG22 instructions versus canonical parent stopping
at21 also remain unresolved. Authenticated prior balance history and required
worksheet source bytes remain open. The [IRS instructions](https://www.irs.gov/instructions/i5471)
and local source contracts remain the basis for those obligations. Full foreign
entity/Form5471/Form8992 parent completion and full-return export are not claimed.

## Integrated main gate

Mainfdc645224 integrates six linkage/proof files without changing tax or lifting the full native/PDF guard. Standardtask permits exactly optionalFORM5471_LINKAGE_EVIDENCE_DIR. Fresh typed linkage/nativeidentity/publicattachmentguard modules pass **24/0** (288ms), `/tmp/opentax-5471-linkage-main-source-identity-guard-oct6.log`; includes actuallinkedparentXSD, referenceID/EIN source positives, 94linkageconflict assertions andpublicexportrejection. Root27page paper review remains exact; no changedPDFdescriptor or statementordering. Isolated192/0+13/0 andall27pixel/11projectionJSONpreservation are separately recorded, notfresh root counts.

Further source inspection confirms the authored diagnostic fixture has no actualUSproperty ledger supporting WorksheetB1000, and ordinaryinterest1000 is included in tested/general income without actualFPHCIexception source. Linkage/XSD/PDF projection success does not establish these tax classifications; source/WorksheetA/B reconstruction is active under the existingforeign/source parent. Frozenoriginals remain diagnostic; no silently changed interest/asset/history or fabricated acceptance. Fullguard stays.
