import { element, elements } from "../../../../mef/xml.ts";
import { projectForm8992Source } from "../../../domains/international/form8992/form8992_source.ts";
import type { MefFormDescriptor } from "../../form-descriptor.ts";

export const form8992ScheduleA: MefFormDescriptor<
  "form8992_schedule_a",
  unknown
> = {
  pendingKey: "form8992_schedule_a",
  sourcePendingKeys: ["f5471"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8992sa.pdf",
  build(_fields, context) {
    if (!context?.pending?.f5471) return "";
    if (!context.filer) {
      throw new Error("Form 8992 Schedule A needs final filer identity");
    }
    const { cfc, calculation, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    const tested = cfc.schedule_i1;
    const allocated = tested.pro_rata_tested_income > 0;
    const row = elements("USShrCalcGILTIGrp", [
      elements("CFCName", [
        element("BusinessNameLine1Txt", cfc.foreign_corp_name),
      ]),
      element("EIN", cfc.foreign_corp_ein),
      cfc.foreign_corp_reference_id
        ? elements("ForeignEntityIdentificationGrp", [
          element("ForeignEntityReferenceIdNum", cfc.foreign_corp_reference_id),
        ])
        : "",
      element("NetTestedIncomeAmt", tested.tested_income),
      element("NetTestedLossAmt", 0),
      element("ProRataShareCFCTestedIncmAmt", tested.pro_rata_tested_income),
      element("ProRataShrNetTestedLossAmt", 0),
      element("ProRataShareQBAIAmt", tested.pro_rata_qbai),
      element("ProRataShrTestedLossQBAIAmt", 0),
      element(
        "ProRataShrTestedIntIncomeAmt",
        tested.pro_rata_tested_interest_income,
      ),
      element(
        "ProRataShrTestedIntExpenseAmt",
        tested.pro_rata_tested_interest_expense,
      ),
      allocated ? element("GILTIAllocationRt", "1.0000") : "",
      allocated ? element("GILTIAllocTestedIncmCFCAmt", calculation.gilti) : "",
    ]);
    return elements("IRS8992ScheduleA", [
      element("ShareholderPersonNm", shareholderName),
      element("SSN", cfc.shareholder_tin),
      row,
      element("TotalNetTestedIncomeAmt", tested.tested_income),
      element("TotalNetTestedLossAmt", 0),
      element("TotProRataShrCFCTestedIncmAmt", tested.pro_rata_tested_income),
      element("TotProRataShrNetTestedLossAmt", 0),
      element("TotalProRataShareQBAIAmt", tested.pro_rata_qbai),
      element("TotProRataShrTestedLossQBAIAmt", 0),
      element(
        "TotProRataShrTestedIntIncmAmt",
        tested.pro_rata_tested_interest_income,
      ),
      element(
        "TotProRataShrTestedIntExpnsAmt",
        tested.pro_rata_tested_interest_expense,
      ),
      allocated ? element("TotalGILTIAllocationRt", "1.0000") : "",
      allocated
        ? element("TotGILTIAllocTestedIncmCFCAmt", calculation.gilti)
        : "",
    ]);
  },
};
