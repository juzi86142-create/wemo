import { z } from "zod";

import { RequestIdSchema, type JsonValue } from "../common/index.js";
import { SessionActorSchema, type SessionActor } from "../identity/index.js";

export const MarketContextSchema = z.object({
  market: z.string().min(2),
  locale: z.string().min(2),
  currency: z.string().length(3),
  b2c_enabled: z.boolean(),
  dealer_enabled: z.boolean(),
});

export const RequestContextSchema = z.object({
  request_id: RequestIdSchema,
  method: z.string().min(1),
  path: z.string().min(1),
  market: z.string().min(2),
  locale: z.string().min(2),
  currency: z.string().length(3),
  ip: z.string().min(1).nullable().optional(),
  user_agent: z.string().min(1).nullable().optional(),
  actor: SessionActorSchema.nullable().optional(),
});

export type RequestContext = z.infer<typeof RequestContextSchema>;
export type MarketContext = z.infer<typeof MarketContextSchema>;
export type RequestActor = SessionActor;
export type RequestPayload = JsonValue;
