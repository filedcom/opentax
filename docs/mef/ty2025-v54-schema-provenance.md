# TY2025 v5.4 MeF schema provenance

Static artifact review, 2026-10-02. The [official IRS TY2025 Form 1040 MeF
release table](https://www.irs.gov/tax-professionals/tax-year-2025-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions)
lists `2025v5.4` as available in the Secure Object Repository (SOR) on May 28,
2026, with an October 13, 2026 ATS date and a production date still marked
`TBD` on this review date. The [IRS v5.4 release
memo](https://www.irs.gov/e-file-providers/release-memo-for-tax-year-2025-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-version-5-point-4)
says the schema and business-rule packages are distributed through registered
e-Services SOR mailboxes. The [IRS SOR
instructions](https://www.irs.gov/tax-professionals/instructions-to-access-the-secure-object-repository-sor-mailbox)
describe access and download. This is the official retrieval reference; no
public direct ZIP URL or IRS-published digest for the exact local file was
confirmed. The IRS says SOR messages remain for 60 days, so a May 2026 v5.4
message may require an authorized reissue if it is no longer in the mailbox.
The [previously noted Drive
folder](https://drive.google.com/drive/folders/1JGK9Tp-9jPX7Cg1xFFKPVBRIYJFvyIlR)
is a local sharing route, not proof that its copy came from SOR.

## Local byte identity

| Artifact examined | SHA-256 | Observation |
| --- | --- | --- |
| `/Users/atul/Downloads/irs/IMF_05-28-2026_Release-2.zip` | `8408dbd9f7ae0040bc588b8daa3b7bb24280c8ca5b2396d9fcfb8c4db64963f4` | 23 MB outer ZIP. A second local copy under `Downloads/untitled folder/mef/` has the same digest; this is the digest already recorded in [TY2026 sources](../ty2026/SOURCES.md), not an IRS attestation. |
| Outer ZIP member `IMF_05-28-2026_Release-2/IMF_Series_2025v5.4.zip` | `92fda5b7d6e5933fcf412fdd9348b93eb1d1719fb080f6cc95cc5e6886922797` | Contains the TY2025 v5.4 series. |
| Series ZIP member `1040x_Schema_2025v5.4.zip` | `cb135657f0b47dfd7434918d074566c6c1d5f47d23cc1e5be4b9cefb64f37e8f` | Matches ignored `.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4.zip`. |
| Schema ZIP member `2025v5.4/IndividualIncomeTax/Ind1040/ReturnData1040.xsd` | `3e38929827717ebb7c6fa17277b6844b1cc0264d3a87f12d83dc68ab1a455397` | Matches the extracted ignored XSD at `.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/ReturnData1040.xsd` and the loose copy inside the outer ZIP. |
| Schema ZIP member `2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd` | `e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c` | Reviewed local root XSD bytes pinned by the filled-PDF review generator and checker. |

The filled-PDF review generator and checker also pin a deterministic digest of
the **entire extracted schema tree** at `2025v5.4`: `2d5c287ae16cc217bfaa27b697cb48eb4ed198f20eee3d728921ae15806d7ff4`.
The digest is SHA-256 over sorted records of each relative path, a NUL byte,
that file's lowercase SHA-256 hex digest, and a newline. All 746 schema-tree
files matched the reviewed local `1040x_Schema_2025v5.4.zip` byte for byte
when this pin was established. The ZIP also contains one diff HTML file outside
the schema tree. This checks local byte identity, not official IRS origin.

To reproduce the byte comparison after obtaining the package from an
**authorized IRS SOR mailbox**, keep it outside Git and run this standard-library
script from the repository root. It verifies the outer ZIP, the two nested ZIP
members and the root XSD; it does not require extraction or run tax tests.

```sh
python3 - /absolute/path/to/IMF_05-28-2026_Release-2.zip <<'PY'
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from sys import argv
from zipfile import ZipFile

outer = Path(argv[1]).read_bytes()
expected = {
    "outer": "8408dbd9f7ae0040bc588b8daa3b7bb24280c8ca5b2396d9fcfb8c4db64963f4",
    "series": "92fda5b7d6e5933fcf412fdd9348b93eb1d1719fb080f6cc95cc5e6886922797",
    "schema": "cb135657f0b47dfd7434918d074566c6c1d5f47d23cc1e5be4b9cefb64f37e8f",
    "root": "3e38929827717ebb7c6fa17277b6844b1cc0264d3a87f12d83dc68ab1a455397",
}
with ZipFile(BytesIO(outer)) as package:
    series = package.read("IMF_05-28-2026_Release-2/IMF_Series_2025v5.4.zip")
with ZipFile(BytesIO(series)) as series_zip:
    schema = series_zip.read("1040x_Schema_2025v5.4.zip")
with ZipFile(BytesIO(schema)) as schema_zip:
    root = schema_zip.read(
        "2025v5.4/IndividualIncomeTax/Ind1040/ReturnData1040.xsd"
    )
for name, data in (("outer", outer), ("series", series),
                   ("schema", schema), ("root", root)):
    actual = sha256(data).hexdigest()
    print(name, actual)
    assert actual == expected[name], f"{name} differs from reviewed bytes"
PY
```

The local archive chain and extracted XSD are byte-consistent. **Origin remains
unverified** until an authorized user retrieves the v5.4 package from the IRS
SOR mailbox and compares its digest to the values above, or preserves an
equivalent trusted receipt. A mismatch requires a new schema review rather
than silently updating the expected hash. These files are ignored, not checked
into Git; a fresh checkout cannot reproduce local XSD validation without an
authorized package. The IRS release table also shows later TY2025 versions, so
v5.4's applicability to a future ATS/production submission must be checked at
the time of filing. Matching a schema digest or passing local XSD validation
does not establish IRS business-rule or ATS acceptance.


## October 7, 2026 connected Drive recheck

The authorized Drive connector returned the complete outer archive in inline
file mode. Private retained bytes: 24,118,850; outer/series/schema digests
match the table above, and ZIP CRC verification passed. All 746 nested
TY2025 v5.4 XSDs match the retained extracted tree with no extra, missing
or changed XSDs. This independently rechecks current Drive bytes against
the retained hashes; it does not provide an IRS-published digest/attestation.
The nested TY2025 schema package contains no business-rule workbook/package.
See the [current execution record](ty2025-readiness-execution-2026-10-07.md)
and private `imf-downloaded-package-audit.json` for exact scope.
