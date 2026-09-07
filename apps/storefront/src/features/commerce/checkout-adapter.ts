import {
  CheckoutCreateSchema,
  OrderMutationResponseSchema,
  type CheckoutCreateInput,
  type Order,
} from "@wemo/contracts";

import { requestJson } from "../platform/api-client";

export async function createCheckout(input: CheckoutCreateInput): Promise<Order> {
  const parsed = CheckoutCreateSchema.parse(input);
  const response = OrderMutationResponseSchema.parse(
    await requestJson<unknown>("/checkout", {
      method: "POST",
      body: JSON.stringify(parsed),
    }),
  );
  return response.item;
}
