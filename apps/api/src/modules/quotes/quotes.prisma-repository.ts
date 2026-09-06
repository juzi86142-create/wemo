import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type { JsonValue, Quote, QuoteListQuery, QuoteVersion } from "@wemo/contracts";

import { DATABASE_CLIENT } from "../../database/database.constants";

import {
  QUOTES_REPOSITORY,
  type QuoteConvertRecord,
  type QuoteCreateRecord,
  type QuoteReviewRecord,
  type QuotesRepository,
} from "./quotes.repository";

type QuoteRow = NonNullable<Awaited<ReturnType<DatabaseClient["quote"]["findUnique"]>>>;
type QuoteVersionRow = Awaited<ReturnType<DatabaseClient["quoteVersion"]["findMany"]>>[number];
type QuoteWhereInput = NonNullable<
  Parameters<DatabaseClient["quote"]["findMany"]>[0]
>["where"];
/** quoteVersion.create 的 data 参数形状（用于 Json snapshot 写入类型收口）。 */
type QuoteVersionCreateData = NonNullable<
  Parameters<DatabaseClient["quoteVersion"]["create"]>[0]
>["data"];
type SnapshotWrite = QuoteVersionCreateData["snapshot"];

/**
 * quote_versions.snapshot 落库形状（= QuoteVersionSnapshotSchema + 服务层扩展键
 * requested_by_user_id，该列不在 quotes 表上，随版本快照持久化）。
 */
interface StoredSnapshot {
  items?: Quote["items"];
  pricing_snapshot?: JsonValue;
  terms_snapshot?: JsonValue;
  status?: Quote["status"];
  valid_until?: string;
  note?: string | null;
  requested_by_user_id?: number | null;
}

function readSnapshot(raw: unknown): StoredSnapshot {
  return (raw ?? {}) as unknown as StoredSnapshot;
}

function nextQuoteNo(): string {
  const suffix = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `QUO-${Date.now()}${suffix}`;
}

function nextOrderNo(): string {
  const suffix = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `ORD-${Date.now()}${suffix}`;
}

@Injectable()
export class QuotesPrismaRepository implements QuotesRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listQuotes(
    query: QuoteListQuery,
  ): Promise<{ items: Quote[]; total: number; page: number; page_size: number }> {
    const where: QuoteWhereInput = {};
    if (query.company_id !== undefined) where.companyId = query.company_id;
    if (query.status !== undefined) where.status = query.status;

    const [rows, total] = await Promise.all([
      this.database.quote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.quote.count({ where }),
    ]);

    const versionRows = await this.fetchVersionsForQuotes(
      rows.map((row) => row.id),
    );
    const items = rows.map((row) => this.mapQuote(row, versionRows.get(row.id) ?? []));

    return { items, total, page: query.page, page_size: query.page_size };
  }

  async getQuoteById(id: number): Promise<Quote | null> {
    return this.loadQuote(id);
  }

  async listVersions(quoteId: number): Promise<QuoteVersion[]> {
    const quote = await this.database.quote.findUnique({ where: { id: quoteId } });
    if (!quote) {
      throw new NotFoundException(`报价 ${quoteId} 不存在`);
    }
    const rows = await this.database.quoteVersion.findMany({
      where: { quoteId },
      orderBy: { version: "asc" },
    });
    return rows.map((row) => this.mapVersion(row));
  }

  async createQuote(input: QuoteCreateRecord): Promise<Quote> {
    const now = new Date();
    const validUntil = new Date(now.getTime() + input.valid_days * 86_400_000);

    let createdId = 0;
    await this.database.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          quoteNo: nextQuoteNo(),
          companyId: input.company_id,
          currentVersion: 1,
          status: "requested",
          validUntil,
        },
      });
      createdId = quote.id;

      await tx.quoteVersion.create({
        data: {
          quoteId: quote.id,
          version: 1,
          createdBy: input.created_by,
          snapshot: {
            items: input.items,
            pricing_snapshot: input.pricing_snapshot,
            terms_snapshot: input.terms_snapshot,
            status: "requested",
            valid_until: validUntil.toISOString(),
            requested_by_user_id: input.requested_by_user_id,
            ...(input.note !== undefined ? { note: input.note } : {}),
          } as unknown as SnapshotWrite,
        },
      });
    });

    const created = await this.loadQuote(createdId);
    if (!created) {
      throw new Error(`报价创建后读取失败: ${createdId}`);
    }
    return created;
  }

  async reviewQuote(
    id: number,
    input: QuoteReviewRecord,
    reviewerId: number,
    _requestId: string,
  ): Promise<Quote> {
    const current = await this.database.quote.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`报价 ${id} 不存在`);
    }

    const versions = await this.database.quoteVersion.findMany({
      where: { quoteId: id },
      orderBy: { version: "asc" },
    });
    const previous = versions[versions.length - 1];
    const prevSnapshot = readSnapshot(previous?.snapshot);

    const now = new Date();
    let validUntil = current.validUntil;
    if (input.decision === "quoted" && validUntil === null) {
      validUntil = new Date(now.getTime() + 30 * 86_400_000);
    }

    await this.database.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          status: input.decision,
          ...(input.decision === "quoted" && validUntil ? { validUntil } : {}),
        },
      });

      await tx.quoteVersion.create({
        data: {
          quoteId: id,
          version: current.currentVersion + 1,
          createdBy: reviewerId,
          snapshot: {
            items: prevSnapshot.items ?? [],
            pricing_snapshot: prevSnapshot.pricing_snapshot ?? {},
            terms_snapshot:
              input.terms_snapshot !== undefined
                ? input.terms_snapshot
                : (prevSnapshot.terms_snapshot ?? {}),
            status: input.decision,
            valid_until: validUntil?.toISOString() ?? prevSnapshot.valid_until ?? now.toISOString(),
            requested_by_user_id: prevSnapshot.requested_by_user_id ?? null,
            ...(input.note !== undefined ? { note: input.note } : {}),
          } as unknown as SnapshotWrite,
        },
      });
    });

    const updated = await this.loadQuote(id);
    if (!updated) {
      throw new Error(`报价评审后读取失败: ${id}`);
    }
    return updated;
  }

  async convertToOrder(
    quoteId: number,
    input: QuoteConvertRecord,
    actorId: number,
    requestId: string,
  ): Promise<Quote> {
    const current = await this.database.quote.findUnique({ where: { id: quoteId } });
    if (!current) {
      throw new NotFoundException(`报价 ${quoteId} 不存在`);
    }

    const versions = await this.database.quoteVersion.findMany({
      where: { quoteId },
      orderBy: { version: "asc" },
    });
    const previous = versions[versions.length - 1];
    const prevSnapshot = readSnapshot(previous?.snapshot);

    // 金额信息来自当前版本快照的 pricing_snapshot（契约中为自由 Json）。
    const pricing = (prevSnapshot.pricing_snapshot ?? {}) as Record<string, unknown>;
    const readMoney = (key: string): number =>
      typeof pricing[key] === "number" ? (pricing[key] as number) : 0;
    const currency =
      typeof pricing.currency === "string" && pricing.currency.length === 3
        ? pricing.currency
        : "USD";

    await this.database.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNo: nextOrderNo(),
          requestId,
          channel: input.channel,
          userId: null,
          companyId: current.companyId,
          currency,
          subtotalMinor: readMoney("subtotal_minor"),
          taxMinor: readMoney("tax_minor"),
          shippingMinor: readMoney("shipping_minor"),
          totalMinor: readMoney("total_minor"),
          status: input.channel === "b2b" ? "pending_review" : "pending_payment",
          addressSnapshot: {},
          pricingSnapshot: {
            quote_id: current.id,
            quote_no: current.quoteNo,
            pricing_snapshot: prevSnapshot.pricing_snapshot ?? null,
            terms_snapshot: prevSnapshot.terms_snapshot ?? null,
            note: input.note ?? null,
          },
        },
      });

      await tx.quote.update({
        where: { id: quoteId },
        data: { status: "converted", convertedOrderId: order.id },
      });

      await tx.quoteVersion.create({
        data: {
          quoteId,
          version: current.currentVersion + 1,
          createdBy: actorId,
          snapshot: {
            items: prevSnapshot.items ?? [],
            pricing_snapshot: prevSnapshot.pricing_snapshot ?? {},
            terms_snapshot: prevSnapshot.terms_snapshot ?? {},
            status: "converted",
            valid_until: prevSnapshot.valid_until ?? new Date().toISOString(),
            requested_by_user_id: prevSnapshot.requested_by_user_id ?? null,
            ...(input.note !== undefined ? { note: input.note } : {}),
          } as unknown as SnapshotWrite,
        },
      });
    });

    const converted = await this.loadQuote(quoteId);
    if (!converted) {
      throw new Error(`报价转单后读取失败: ${quoteId}`);
    }
    return converted;
  }

  private async loadQuote(id: number): Promise<Quote | null> {
    const quote = await this.database.quote.findUnique({ where: { id } });
    if (!quote) {
      return null;
    }
    const versions = await this.database.quoteVersion.findMany({
      where: { quoteId: id },
      orderBy: { version: "asc" },
    });
    return this.mapQuote(quote, versions);
  }

  private async fetchVersionsForQuotes(
    quoteIds: number[],
  ): Promise<Map<number, QuoteVersionRow[]>> {
    if (quoteIds.length === 0) {
      return new Map();
    }
    const rows = await this.database.quoteVersion.findMany({
      where: { quoteId: { in: quoteIds } },
      orderBy: { version: "asc" },
    });
    const byQuote = new Map<number, QuoteVersionRow[]>();
    for (const row of rows) {
      const bucket = byQuote.get(row.quoteId);
      if (bucket) {
        bucket.push(row);
      } else {
        byQuote.set(row.quoteId, [row]);
      }
    }
    return byQuote;
  }

  private mapQuote(quote: QuoteRow, versions: QuoteVersionRow[]): Quote {
    const ordered = [...versions].sort((a, b) => a.version - b.version);
    const current =
      ordered.find((v) => v.version === quote.currentVersion) ??
      ordered[ordered.length - 1];
    const snapshot = readSnapshot(current?.snapshot);
    const lastVersion = ordered[ordered.length - 1];
    const validUntil = quote.validUntil?.toISOString() ?? snapshot.valid_until;

    return {
      id: quote.id,
      quote_no: quote.quoteNo,
      company_id: quote.companyId,
      requested_by_user_id: snapshot.requested_by_user_id ?? null,
      current_version: quote.currentVersion,
      status: quote.status as Quote["status"],
      valid_until: validUntil ?? quote.createdAt.toISOString(),
      converted_order_id: quote.convertedOrderId,
      pricing_snapshot: snapshot.pricing_snapshot ?? {},
      terms_snapshot: snapshot.terms_snapshot ?? {},
      items: snapshot.items ?? [],
      versions: ordered.map((v) => this.mapVersion(v)),
      created_at: quote.createdAt.toISOString(),
      updated_at:
        lastVersion?.createdAt.toISOString() ?? quote.createdAt.toISOString(),
    };
  }

  private mapVersion(row: QuoteVersionRow): QuoteVersion {
    return {
      id: row.id,
      quote_id: row.quoteId,
      version: row.version,
      snapshot: row.snapshot as unknown as QuoteVersion["snapshot"],
      created_by: row.createdBy,
      created_at: row.createdAt.toISOString(),
    };
  }
}
