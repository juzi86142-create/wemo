import { describe, expect, it, vi } from "vitest";

import { ApiError, requestJson } from "./api-client";

describe("requestJson", () => {
  it("retains the request id from a failed API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "service_unavailable",
            message: "Temporarily unavailable",
            field_errors: [],
            request_id: "req-1",
          }),
          { status: 503 },
        ),
      ),
    );

    const error = await requestJson("/catalog/products").catch((value) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503, requestId: "req-1" });

    vi.unstubAllGlobals();
  });
});
