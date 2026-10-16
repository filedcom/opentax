# TY2025 Form 8396: reissued mortgage credit certificate

The [2025 Form 8396 instructions](https://www.irs.gov/pub/irs-pdf/f8396.pdf),
page 2, permit a credit after refinancing only when the replacement certificate
has the same holders and property, fully replaces the old certificate, does not
raise certified indebtedness or the certificate rate, and cannot produce a
larger line 3 than the original certificate would have allowed. They direct the
taxpayer to calculate that original amount from interest scheduled on the
original mortgage and the original certificate rate. The ordinary line 3 limit
of $2,000 applies when a certificate rate exceeds 20%.

`reviewed_reissued_mcc` is a single direct source record for a **2025 claim
after a refinance in an earlier year**. It identifies both certificates, the
refinance settlement, issuer compliance record, and original amortization
schedule; fixes the holder/property/replacement assertions; and supplies the
original scheduled 2025 interest. Form 8396 line 3 is the lesser of the
reissued-certificate calculation and the original-certificate ceiling. The MeF
route reconciles the actual interest to the identified 2025 Form 1098 when that
evidence type is used. When a Form 8828 disposition is also present, the MeF and
PDF routes require an exact certificate-reference pair and matching issuer,
address, loan, refinance, debt and rate facts.

The source graph does not ingest certificate or amortization-document bytes. The
reviewed amounts and issuer conditions therefore remain documentary assertions,
and the original schedule figure cannot be recomputed independently in the
graph. A refinance **during 2025 with different certificate rates** needs the
original/reissued portion calculations and an attached statement under the
instructions; that route remains closed. The current source also excludes a
nonspouse co-owner on a reissued certificate and limits this branch to an
original certificate covering the whole original mortgage, so no share or
original-loan allocation is inferred.
