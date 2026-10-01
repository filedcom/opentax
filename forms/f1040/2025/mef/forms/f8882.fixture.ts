import {
  form8882Fixture,
  form8882ScheduleCFixture,
} from "../../../nodes/inputs/f8882/fixture.ts";

export function form8882PreparedFixture() {
  const source = form8882Fixture();
  return {
    source,
    pending: {
      f8882: source,
      f1040: { taxpayer_ssn: "111223333" },
      schedule_c: form8882ScheduleCFixture(),
    },
  };
}
