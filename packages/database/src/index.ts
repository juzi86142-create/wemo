import type * as PrismaClient from "@prisma/client";

export type LanguageRecord = PrismaClient.Language;
export type MarketRecord = PrismaClient.Market;
export type MarketLocaleRecord = PrismaClient.MarketLocale;
export * from "./client.js";
