import { describe, expect, it, vi } from "vitest";

import { analyticsEvents, trackEvent } from "./analytics";

describe("checkout analytics", () => {
  it("exposes stable checkout event names", () => {
    expect(analyticsEvents.beginCheckout).toBe("begin_checkout");
    expect(analyticsEvents.checkoutSuccess).toBe("checkout_success");
    expect(analyticsEvents.checkoutFailure).toBe("checkout_failure");
  });

  it("exposes stable dealer application event names", () => {
    expect(analyticsEvents.dealerApplyStart).toBe("dealer_apply_start");
    expect(analyticsEvents.dealerApplySubmit).toBe("dealer_apply_submit");
  });

  it("emits only scalar checkout properties in the browser", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });

    trackEvent(analyticsEvents.checkoutFailure, { status: 409, request_id: "req-1" });

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0].detail).toEqual({
      event: "checkout_failure",
      properties: { status: 409, request_id: "req-1" },
    });

    vi.unstubAllGlobals();
  });
});
