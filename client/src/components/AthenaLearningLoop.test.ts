import { describe, expect, it } from "vitest";
import { learningControlsAvailable } from "./AthenaLearningLoop";

describe("Athena Learning Loop UI helpers", () => {
  it("exposes executive feedback and measurement controls", () => {
    expect(learningControlsAvailable()).toEqual([
      "Accept",
      "Dismiss",
      "Defer",
      "Mark Modified",
      "Assign Owner",
      "Add Feedback",
      "Record Measurement",
      "Mark Review Due",
    ]);
  });
});
