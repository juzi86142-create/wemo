import { describe, expect, it } from "vitest";

import { dealerQuotes, getDealerActionSelection } from "./dealer-fixtures";

describe("dealer action panel selection", () => {
  it("moves selection to the first visible record when a filter hides the current record", () => {
    const selection = getDealerActionSelection(dealerQuotes, "Expired", "Q-2481");

    expect(selection.filtered.map((row) => row.id)).toEqual(["Q-2458"]);
    expect(selection.selected?.id).toBe("Q-2458");
    expect(selection.selected?.status).toBe("Expired");
  });
});
