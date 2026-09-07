import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import {
  CartMutationResponseSchema,
  CheckoutCreateSchema,
  OrderMutationResponseSchema,
  type Cart,
  type CheckoutCreateInput,
  type Order,
} from "../packages/contracts/src";

const MOCK_DATE = "2026-09-08T00:00:00.000Z";
const DEFAULT_PORT = 4010;
const MAX_BODY_BYTES = 128 * 1024;

type MockHttpResponse = {
  status: number;
  body: unknown;
};

type VariantFixture = {
  variantId: number;
  sku: string;
  name: string;
  note: string;
  priceMinor: number;
  currency: "USD";
  stock: number;
};

const variants = new Map<number, VariantFixture>([
  [
    1001,
    {
      variantId: 1001,
      sku: "WEMO-BOWL-001",
      name: "Roll & Play Bowling Set",
      note: "7 piece set",
      priceMinor: 3200,
      currency: "USD",
      stock: 20,
    },
  ],
  [
    1002,
    {
      variantId: 1002,
      sku: "WEMO-BALANCE-001",
      name: "Steady Balance Board",
      note: "Indoor / outdoor",
      priceMinor: 4400,
      currency: "USD",
      stock: 12,
    },
  ],
]);

export { type MockHttpResponse };

function fixtureCart(): Cart {
  const items = [...variants.values()].map((variant, index) => ({
    id: index + 1,
    variant_id: variant.variantId,
    quantity: 1,
    unit_price_minor: variant.priceMinor,
    line_total_minor: variant.priceMinor,
    currency: variant.currency,
    snapshot: { name: variant.name, note: variant.note },
    added_at: MOCK_DATE,
    updated_at: MOCK_DATE,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.line_total_minor, 0);

  return {
    id: 501,
    user_id: null,
    company_id: null,
    channel: "guest",
    market: "US",
    currency: "USD",
    status: "active",
    items,
    subtotal_minor: subtotal,
    total_minor: subtotal,
    updated_at: MOCK_DATE,
    expires_at: null,
    created_at: MOCK_DATE,
  };
}

function apiError(
  status: number,
  requestId: string,
  message: string,
  fieldErrors: Array<{ field: string; message: string }> = [],
): MockHttpResponse {
  return {
    status,
    body: {
      code: "CONTRACT_MOCK_ERROR",
      message,
      field_errors: fieldErrors,
      request_id: requestId,
    },
  };
}

export function createMockCartResponse(requestId: string): MockHttpResponse {
  const body = CartMutationResponseSchema.parse({
    request_id: requestId,
    item: fixtureCart(),
  });
  return { status: 200, body };
}

function parseCheckoutInput(body: unknown, requestId: string): CheckoutCreateInput | MockHttpResponse {
  const parsed = CheckoutCreateSchema.safeParse(body);
  if (parsed.success) return parsed.data;

  return apiError(
    400,
    requestId,
    "The checkout request is invalid.",
    parsed.error.issues.map((issue) => ({
      field: issue.path.join(".") || "checkout",
      message: issue.message,
    })),
  );
}

function createOrder(input: CheckoutCreateInput, requestId: string): MockHttpResponse {
  const orderItems: Order["items"] = [];

  for (const [index, inputItem] of input.items.entries()) {
    const variant = variants.get(inputItem.variant_id);
    if (!variant) {
      return apiError(409, requestId, "The selected product is unavailable.");
    }
    if (inputItem.quantity > variant.stock) {
      return apiError(409, requestId, `${variant.name} is out of stock.`);
    }

    const lineTotal = variant.priceMinor * inputItem.quantity;
    orderItems.push({
      id: 9100 + index,
      variant_id: variant.variantId,
      sku_snapshot: variant.sku,
      name_snapshot: variant.name,
      quantity: inputItem.quantity,
      unit_price_minor: variant.priceMinor,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: lineTotal,
      detail_snapshot: { note: variant.note, source: "contract-mock" },
    });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.total_minor, 0);
  const order = OrderMutationResponseSchema.parse({
    request_id: requestId,
    item: {
      id: 9001,
      order_no: `WMO-MOCK-${requestId.slice(-8).toUpperCase()}`,
      channel: "b2c",
      user_id: null,
      company_id: null,
      currency: "USD",
      subtotal_minor: subtotal,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: subtotal,
      status: "pending_payment",
      address_snapshot: input.shipping_address,
      pricing_snapshot: {
        source: "contract-mock",
        currency: "USD",
        items: orderItems.map((item) => ({
          variant_id: item.variant_id,
          unit_price_minor: item.unit_price_minor,
        })),
      },
      items: orderItems,
      status_history: [
        {
          status: "pending_payment",
          request_id: requestId,
          note: "Contract mock response; no live order was created.",
          created_at: MOCK_DATE,
        },
      ],
      created_at: MOCK_DATE,
      updated_at: MOCK_DATE,
    },
  });

  return { status: 200, body: order };
}

export function handleMockRequest(
  method: string,
  pathname: string,
  body: unknown,
  requestId: string,
): MockHttpResponse {
  if (pathname === "/api/v1/cart") {
    return method === "GET"
      ? createMockCartResponse(requestId)
      : apiError(405, requestId, "Method not allowed.");
  }

  if (pathname === "/api/v1/auth/sessions") {
    return method === "GET"
      ? apiError(401, requestId, "Authentication is not available in contract mock mode.")
      : apiError(405, requestId, "Method not allowed.");
  }

  if (pathname === "/api/v1/checkout") {
    if (method !== "POST") return apiError(405, requestId, "Method not allowed.");
    const parsed = parseCheckoutInput(body, requestId);
    return "status" in parsed ? parsed : createOrder(parsed, requestId);
  }

  return apiError(404, requestId, "Contract mock route not found.");
}

function sendJson(response: ServerResponse, result: MockHttpResponse) {
  const body = JSON.stringify(result.body);
  response.statusCode = result.status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Wemo-Environment", "contract-mock");
  response.end(body);
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }

  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleHttpRequest(request: IncomingMessage, response: ServerResponse) {
  const requestId =
    typeof request.headers["x-request-id"] === "string" && request.headers["x-request-id"]
      ? request.headers["x-request-id"]
      : `mock-${randomUUID()}`;

  try {
    const body = request.method === "POST" ? await readBody(request) : undefined;
    const result = handleMockRequest(
      request.method ?? "GET",
      new URL(request.url ?? "/", "http://127.0.0.1").pathname,
      body,
      requestId,
    );
    sendJson(response, result);
  } catch (error) {
    sendJson(
      response,
      apiError(
        error instanceof SyntaxError ? 400 : 413,
        requestId,
        error instanceof SyntaxError ? "The request body is not valid JSON." : "The request body is too large.",
      ),
    );
  }
}

export function startMockServer(port = Number(process.env.WEMO_MOCK_PORT ?? DEFAULT_PORT)): Promise<Server> {
  const server = createServer((request, response) => {
    void handleHttpRequest(request, response);
  });

  return new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      console.log(`CONTRACT MOCK ONLY: http://127.0.0.1:${port}`);
      resolveServer(server);
    });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  void startMockServer().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
