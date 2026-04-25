import { describe, expect, it } from "vitest";

import { describeTimelineMeaning } from "./capabilityNarrative";

describe("describeTimelineMeaning", () => {
  it("explains reviewable local App OS audit events", () => {
    expect(
      describeTimelineMeaning(
        "reviewable_local",
        null,
        "App control applied report recorded for app-control-test.",
      ),
    ).toMatch(/App OS apply or revert receipt/i);
  });
});
