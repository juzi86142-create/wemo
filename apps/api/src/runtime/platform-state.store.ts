import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import { DATABASE_CLIENT } from "../database/database.constants";
import type { JsonValue } from "@wemo/contracts/common";
import type {
  AnalyticsEventInput, AnalyticsEventRecord, AuditLog, AuditLogQuery,
  IntegrationAdapter, IntegrationKind, JobKind, JobRun, JobStatus,
  OutboxEvent, OutboxStatus, PlatformSetting, PlatformSettingsSnapshot,
  ReportKind, ReportSnapshot, RequestContext, WebhookDelivery,
  WebhookDeliveryStatus, WebhookIngest,
} from "@wemo/contracts/platform";

type ListResult<T> = { items: T[]; page: number; page_size: number; total: number };
type JobAttempt = JobRun["attempts_history"][number];

/** Prisma repository for platform settings, audit, jobs, integrations and analytics. */
@Injectable()
export class PlatformRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  private page<T>(items: T[], page = 1, pageSize = 20): ListResult<T> { return { items, page, page_size: pageSize, total: items.length }; }
  private obj(value: unknown): Record<string, any> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {}; }
  private arr<T = any>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
  private iso(value: Date | null | undefined): string | null { return value ? value.toISOString() : null; }
  private nextVersion(version: string): string { const n = Number.parseInt(version, 10); return Number.isFinite(n) ? String(n + 1) : `${version}.1`; }

  private settingDto(row: any): PlatformSetting {
    return { id: row.id, group_name: row.groupName, key: row.key, value: row.value as JsonValue, version: row.version,
      updated_by: row.updatedBy, updated_at: row.updatedAt.toISOString(), is_sensitive: Boolean(row.isSensitive ?? false) };
  }
  async snapshotSettings(requestId: string): Promise<PlatformSettingsSnapshot> {
    const settings = await this.listSettings(); const groups = new Map<string, PlatformSetting[]>();
    for (const setting of settings) groups.set(setting.group_name, [...(groups.get(setting.group_name) ?? []), setting]);
    return { request_id: requestId, generated_at: new Date().toISOString(), groups: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([group_name, items]) => ({ group_name, items: items.sort((a, b) => a.key.localeCompare(b.key)) })) };
  }
  async listSettings(): Promise<PlatformSetting[]> {
    const rows = await this.db.systemSetting.findMany({ orderBy: [{ groupName: "asc" }, { key: "asc" }] });
    return rows.map((row) => this.settingDto(row));
  }
  async upsertSetting(input: { group_name: string; key: string; value: JsonValue; expected_version?: string | undefined; is_sensitive?: boolean | undefined }, context: RequestContext): Promise<PlatformSetting> {
    const saved = await this.db.$transaction(async (tx) => {
      const existing = await tx.systemSetting.findUnique({ where: { groupName_key: { groupName: input.group_name, key: input.key } } });
      if (existing && input.expected_version && existing.version !== input.expected_version) throw new ConflictException("设置版本已变化，请刷新后重试");
      const row = existing
        ? await tx.systemSetting.update({ where: { id: existing.id }, data: { value: input.value as any, version: this.nextVersion(existing.version), updatedBy: context.actor?.user_id ?? 1 } })
        : await tx.systemSetting.create({ data: { groupName: input.group_name, key: input.key, value: input.value as any, version: "1", updatedBy: context.actor?.user_id ?? 1 } });
      await tx.auditLog.create({ data: { actorId: context.actor?.user_id ?? 1, action: existing ? "settings.update" : "settings.create", entity: "system_setting", entityId: row.id, before: (existing ? this.settingDto(existing) : null) as any, after: this.settingDto(row) as any, ip: context.ip ?? null, requestId: context.request_id } });
      await tx.outboxEvent.create({ data: { topic: existing ? "settings.updated" : "settings.created", aggregateId: row.id, payload: { group_name: row.groupName, key: row.key, version: row.version }, requestId: context.request_id } } as any);
      return row;
    });
    return this.settingDto(saved);
  }

  private auditDto(row: any): AuditLog { return { id: row.id, actor_id: row.actorId, action: row.action, entity: row.entity, entity_id: row.entityId, before: row.before as JsonValue | null, after: row.after as JsonValue | null, ip: row.ip ?? null, request_id: row.requestId, created_at: row.createdAt.toISOString() }; }
  async listAuditLogs(query: AuditLogQuery): Promise<ListResult<AuditLog>> {
    const where: any = { ...(query.entity ? { entity: query.entity } : {}), ...(query.action ? { action: query.action } : {}), ...(query.actor_id ? { actorId: query.actor_id } : {}), ...(query.request_id ? { requestId: query.request_id } : {}) };
    const [rows, total] = await Promise.all([this.db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.page_size, take: query.page_size }), this.db.auditLog.count({ where })]);
    return { items: rows.map((r) => this.auditDto(r)), page: query.page, page_size: query.page_size, total };
  }
  async recordAudit(input: { actor_id: number; action: string; entity: string; entity_id: number; before: unknown; after: unknown; ip: string | null; request_id: string }): Promise<AuditLog> {
    const row = await this.db.auditLog.create({ data: { actorId: input.actor_id, action: input.action, entity: input.entity, entityId: input.entity_id, before: input.before as any, after: input.after as any, ip: input.ip, requestId: input.request_id } });
    return this.auditDto(row);
  }

  private outboxDto(row: any): OutboxEvent { return { id: row.id, topic: row.topic, aggregate_id: row.aggregateId, payload: row.payload as JsonValue, status: row.status, available_at: row.availableAt.toISOString(), processed_at: this.iso(row.processedAt), request_id: row.requestId ?? "", attempts: row.attempts ?? 0, failure_reason: row.failureReason ?? null, created_at: row.createdAt.toISOString() }; }
  async enqueueOutbox(input: { topic: string; aggregate_id: number; payload: JsonValue; request_id: string; available_at?: string }): Promise<OutboxEvent> {
    const row = await this.db.outboxEvent.create({ data: { topic: input.topic, aggregateId: input.aggregate_id, payload: input.payload as any, status: "pending", availableAt: input.available_at ? new Date(input.available_at) : new Date(), requestId: input.request_id, attempts: 0 } as any });
    return this.outboxDto(row);
  }
  async listOutboxEvents(query: { status?: OutboxStatus | undefined; topic?: string | undefined; request_id?: string | undefined; page?: number | undefined; page_size?: number | undefined }): Promise<ListResult<OutboxEvent>> {
    const page = query.page ?? 1, pageSize = query.page_size ?? 20;
    const where: any = { ...(query.status ? { status: query.status } : {}), ...(query.topic ? { topic: query.topic } : {}), ...(query.request_id ? { requestId: query.request_id } : {}) };
    const [rows, total] = await Promise.all([this.db.outboxEvent.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), this.db.outboxEvent.count({ where })]);
    return { items: rows.map((r) => this.outboxDto(r)), page, page_size: pageSize, total };
  }

  private jobDto(row: any): JobRun {
    return { id: row.id, kind: row.jobKey, status: row.status, idempotency_key: row.idempotencyKey, request_id: row.requestId, actor_id: row.requestedBy ?? null, company_id: null, payload: {}, progress: row.totalItems ? Math.round(row.succeededItems / row.totalItems * 100) : 0, attempts: row.attempts, max_attempts: 3, failure_reason: row.errorMessage ?? null, last_error: null, next_run_at: this.iso(row.queuedAt), started_at: this.iso(row.startedAt), finished_at: this.iso(row.completedAt), created_at: row.queuedAt.toISOString(), updated_at: row.updatedAt.toISOString(), attempts_history: [] };
  }
  async createJobRun(input: { kind: JobKind; payload: JsonValue; idempotency_key: string; max_attempts: number; request_id: string; actor_id: number | null; company_id: number | null }): Promise<JobRun> {
    const existing = await this.db.jobRun.findUnique({ where: { idempotencyKey: input.idempotency_key } }); if (existing) return this.jobDto(existing);
    const row = await this.db.$transaction(async (tx) => {
      const job = await tx.jobRun.create({ data: { jobKey: input.kind, runNo: `${input.kind}-${Date.now()}`, status: "queued", idempotencyKey: input.idempotency_key, requestId: input.request_id, requestedBy: input.actor_id, totalItems: 0, succeededItems: 0, failedItems: 0, attempts: 0 } as any });
      await tx.outboxEvent.create({ data: { topic: "job.created", aggregateId: job.id, payload: { kind: job.jobKey, idempotency_key: job.idempotencyKey }, requestId: input.request_id } as any });
      return job;
    });
    return this.jobDto(row);
  }
  async listJobs(query: { kind?: JobKind | undefined; status?: JobStatus | undefined; request_id?: string | undefined; actor_id?: number | undefined; created_from?: string | undefined; created_to?: string | undefined; page?: number | undefined; page_size?: number | undefined }): Promise<ListResult<JobRun>> {
    const page = query.page ?? 1, pageSize = query.page_size ?? 20; const where: any = { ...(query.kind ? { kind: query.kind } : {}), ...(query.status ? { status: query.status } : {}), ...(query.request_id ? { requestId: query.request_id } : {}), ...(query.actor_id ? { actorId: query.actor_id } : {}), ...((query.created_from || query.created_to) ? { createdAt: { ...(query.created_from ? { gte: new Date(query.created_from) } : {}), ...(query.created_to ? { lte: new Date(query.created_to) } : {}) } } : {}) };
    const [rows, total] = await Promise.all([this.db.jobRun.findMany({ where: { jobKey: where.kind, status: where.status, requestId: where.requestId, requestedBy: where.actorId }, orderBy: { queuedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), this.db.jobRun.count({ where: { jobKey: where.kind, status: where.status, requestId: where.requestId, requestedBy: where.actorId } })]);
    return { items: rows.map((r) => this.jobDto(r)), page, page_size: pageSize, total };
  }
  async getJob(id: number): Promise<JobRun> { const row = await this.db.jobRun.findUnique({ where: { id } }); if (!row) throw new NotFoundException("任务不存在"); return this.jobDto(row); }

  async retryJob(id: number, requestId: string, actorId: number, reason?: string): Promise<JobRun> {
    const current = await this.getJob(id);
    if (current.status === "succeeded") throw new ConflictException("已成功的任务不能重试");
    const now = new Date();
    const history = [...current.attempts_history, { attempt_no: current.attempts + 1, status: "retrying", started_at: now.toISOString(), finished_at: null, failure_reason: reason ?? null, request_id: requestId }];
    const row = await this.db.jobRun.update({ where: { id }, data: { status: "retrying", attempts: current.attempts + 1, startedAt: current.started_at ? new Date(current.started_at) : now, errorMessage: reason ?? current.failure_reason } } as any);
    await this.recordAudit({ actor_id: actorId, action: "job.retry", entity: "job_run", entity_id: id, before: current, after: this.jobDto(row), ip: null, request_id: requestId });
    return this.jobDto(row);
  }
  async completeJob(id: number, requestId: string, actorId: number, result: JsonValue): Promise<JobRun> {
    const current = await this.getJob(id); const now = new Date();
    const history = this.arr<JobAttempt>(current.attempts_history).map((a, i, all) => i === all.length - 1 ? { ...a, status: "succeeded" as const, finished_at: now.toISOString() } : a);
    const row = await this.db.jobRun.update({ where: { id }, data: { status: "succeeded", completedAt: now, errorMessage: null } } as any);
    await this.enqueueOutbox({ topic: "job.completed", aggregate_id: id, payload: result, request_id: requestId });
    await this.recordAudit({ actor_id: actorId, action: "job.complete", entity: "job_run", entity_id: id, before: current, after: this.jobDto(row), ip: null, request_id: requestId });
    return this.jobDto(row);
  }
  async failJob(id: number, requestId: string, actorId: number, reason: string, lastError?: JsonValue): Promise<JobRun> {
    const current = await this.getJob(id); const now = new Date();
    const history = this.arr<JobAttempt>(current.attempts_history).map((a, i, all) => i === all.length - 1 ? { ...a, status: "failed" as const, finished_at: now.toISOString(), failure_reason: reason } : a);
    const row = await this.db.jobRun.update({ where: { id }, data: { status: "failed", completedAt: now, errorMessage: reason } } as any);
    await this.recordAudit({ actor_id: actorId, action: "job.fail", entity: "job_run", entity_id: id, before: current, after: this.jobDto(row), ip: null, request_id: requestId });
    return this.jobDto(row);
  }

  private integrationDto(row: any): IntegrationAdapter {
    const config = this.obj(row.config); return { id: row.id, code: row.integrationKey, kind: config.kind ?? "integration", provider: row.provider, status: row.status, last_checked_at: this.iso(row.updatedAt), last_error: null, capabilities: this.arr<string>(config.capabilities), metadata: config as JsonValue };
  }
  async listIntegrations(): Promise<ListResult<IntegrationAdapter>> { const rows = await this.db.integrationConfig.findMany({ orderBy: { provider: "asc" } }); return this.page(rows.map((r) => this.integrationDto(r)), 1, Math.max(rows.length, 20)); }
  async registerIntegration(input: { provider: string; kind: IntegrationKind; capabilities?: string[] }): Promise<IntegrationAdapter> {
    const existing = await this.db.integrationConfig.findFirst({ where: { provider: input.provider, integrationKey: `${input.kind}:${input.provider}` } }); if (existing) return this.integrationDto(existing);
    const row = await this.db.integrationConfig.create({ data: { integrationKey: `${input.kind}:${input.provider}`.replaceAll(" ", "-"), provider: input.provider, environment: "local", status: "active", config: { kind: input.kind, capabilities: input.capabilities ?? [] } } });
    return this.integrationDto(row);
  }
  private deliveryDto(row: any): WebhookDelivery { return { id: row.id, integration_id: row.aggregateId ?? 0, provider: row.provider, event: row.eventType, status: row.status, idempotency_key: row.externalEventId, request_id: row.requestId ?? "", attempt_count: row.retryCount, failure_reason: row.failureReason ?? null, payload: row.payload as JsonValue, response: null, created_at: row.receivedAt.toISOString(), updated_at: row.updatedAt.toISOString(), completed_at: this.iso(row.processedAt) }; }
  async listDeliveries(query: { provider?: string | undefined; status?: WebhookDeliveryStatus | undefined; request_id?: string | undefined; page?: number | undefined; page_size?: number | undefined }): Promise<ListResult<WebhookDelivery>> {
    const page = query.page ?? 1, pageSize = query.page_size ?? 20; const where: any = { ...(query.provider ? { provider: query.provider } : {}), ...(query.status ? { status: query.status } : {}), ...(query.request_id ? { requestId: query.request_id } : {}) };
    const [rows, total] = await Promise.all([this.db.webhookReceipt.findMany({ where: { provider: where.provider, status: where.status, requestId: where.requestId }, orderBy: { receivedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), this.db.webhookReceipt.count({ where: { provider: where.provider, status: where.status, requestId: where.requestId } })]);
    return { items: rows.map((r) => this.deliveryDto(r)), page, page_size: pageSize, total };
  }
  async recordWebhookDelivery(input: { provider: string; integration_kind?: IntegrationKind | undefined; request_id: string; actor_id: number | null; signature: string | null; signature_version?: string | undefined; ingest: WebhookIngest; verified: boolean; response?: JsonValue | undefined }): Promise<WebhookDelivery> {
    const duplicate = await this.db.webhookReceipt.findFirst({ where: { provider: input.provider, externalEventId: input.ingest.idempotency_key } });
    if (duplicate) return this.deliveryDto(duplicate);
    const row = await this.db.webhookReceipt.create({ data: { provider: input.provider, externalEventId: input.ingest.idempotency_key, eventType: input.ingest.event, status: input.verified ? "accepted" : "rejected", requestId: input.request_id, retryCount: 0, failureReason: input.verified ? null : "签名校验失败", payload: input.ingest.payload as any, signatureHash: input.signature, processedAt: input.verified ? new Date() : null } } as any);
    await this.recordAudit({ actor_id: input.actor_id ?? 1, action: "integration.webhook", entity: "integration_delivery", entity_id: row.id, before: null, after: this.deliveryDto(row), ip: null, request_id: input.request_id });
    return this.deliveryDto(row);
  }

  private analyticsDto(row: any): AnalyticsEventRecord {
    return { id: row.id, name: row.name, request_id: row.requestId, user_id: row.userId ?? null, company_id: row.companyId ?? null,
      market: row.market ?? null, locale: row.locale ?? null, device: row.device ?? null, role: row.role ?? null,
      payload: row.payload as JsonValue, dedupe_key: row.eventKey, occurred_at: row.occurredAt.toISOString() };
  }
  async recordAnalyticsEvents(events: AnalyticsEventInput[], context: RequestContext): Promise<{ accepted: AnalyticsEventRecord[]; deduplicated: number }> {
    const accepted: AnalyticsEventRecord[] = []; let deduplicated = 0;
    for (const [index, event] of events.entries()) {
      const dedupeKey = event.dedupe_key ?? `${context.request_id}:${event.name}:${index}`;
      const existing = await this.db.analyticsEvent.findUnique({ where: { eventKey: dedupeKey } });
      if (existing) { accepted.push(this.analyticsDto(existing)); deduplicated++; continue; }
      const row = await this.db.analyticsEvent.create({ data: { eventKey: dedupeKey, name: event.name, requestId: context.request_id, userId: context.actor?.user_id ?? null, companyId: context.actor?.company_id ?? null, market: event.market ?? context.market ?? null, locale: event.locale ?? context.locale ?? null, device: event.device ?? null, payload: event.payload as any } } as any);
      accepted.push(this.analyticsDto(row));
    }
    await this.enqueueOutbox({ topic: "analytics.recorded", aggregate_id: accepted[0]?.id ?? 0, payload: { accepted: accepted.length, deduplicated }, request_id: context.request_id });
    return { accepted, deduplicated };
  }
  async listAnalyticsEvents(query: { name?: string | undefined; request_id?: string | undefined; company_id?: number | undefined; market?: string | undefined; locale?: string | undefined; page?: number | undefined; page_size?: number | undefined }): Promise<ListResult<AnalyticsEventRecord>> {
    const page = query.page ?? 1, pageSize = query.page_size ?? 20; const where: any = { ...(query.name ? { name: query.name } : {}), ...(query.request_id ? { requestId: query.request_id } : {}), ...(query.company_id ? { companyId: query.company_id } : {}), ...(query.market ? { market: query.market } : {}), ...(query.locale ? { locale: query.locale } : {}) };
    const [rows, total] = await Promise.all([this.db.analyticsEvent.findMany({ where, orderBy: { occurredAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), this.db.analyticsEvent.count({ where })]);
    return { items: rows.map((r) => this.analyticsDto(r)), page, page_size: pageSize, total };
  }
  private number(value: JsonValue, key: string): number { const candidate = this.obj(value)[key]; return typeof candidate === "number" ? candidate : Number(candidate) || 0; }
  async buildReportSnapshot(kind: ReportKind, requestId: string, period?: { from?: string | undefined; to?: string | undefined } | undefined): Promise<ReportSnapshot> {
    const where: any = {}; if (period?.from || period?.to) where.occurredAt = { ...(period.from ? { gte: new Date(period.from) } : {}), ...(period.to ? { lte: new Date(period.to) } : {}) };
    const analytics = (await this.db.analyticsEvent.findMany({ where, orderBy: { occurredAt: "asc" }})).map((r) => this.analyticsDto(r));
    const count = (name: string) => analytics.filter((e) => e.name === name).length;
    const dashboardCounts = kind === "dashboard"
      ? await Promise.all([
          this.db.systemSetting.count(),
          this.db.auditLog.count(),
          this.db.jobRun.count({ where: { status: { in: ["queued", "running", "retrying"] } } }),
          this.db.integrationConfig.count({ where: { status: "active" } }),
          this.db.outboxEvent.count({ where: { status: "pending" } }),
        ])
      : null;
    const metrics: any[] = (() => {
      switch (kind) {
        case "dashboard": return [
          { key: "settings.count", label: "Settings", value: dashboardCounts![0] },
          { key: "audit.count", label: "Audit Logs", value: dashboardCounts![1] },
          { key: "jobs.pending", label: "Pending Jobs", value: dashboardCounts![2] },
          { key: "integrations.healthy", label: "Healthy Integrations", value: dashboardCounts![3] },
          { key: "analytics.events", label: "Analytics Events", value: analytics.length },
          { key: "outbox.pending", label: "Pending Outbox", value: dashboardCounts![4] },
        ];
        case "sales": return [{ key: "purchase.count", label: "Purchases", value: count("purchase") }, { key: "purchase.revenue_minor", label: "Revenue", value: analytics.filter((e) => e.name === "purchase").reduce((s, e) => s + this.number(e.payload, "revenue_minor"), 0), unit: "minor" }];
        case "product": return [{ key: "product.view", label: "Product Views", value: count("view_product") }, { key: "cart.add", label: "Add To Cart", value: count("add_to_cart") }, { key: "purchase.count", label: "Purchases", value: count("purchase") }];
        case "dealer": return [{ key: "dealer.apply.submit", label: "Dealer Applications", value: count("dealer_apply_submit") }, { key: "quote.request", label: "Quote Requests", value: count("request_quote") }];
        case "content": return [{ key: "download.count", label: "Downloads", value: count("download_asset") }, { key: "home.view", label: "Home Views", value: count("view_home") }];
        case "search": return [{ key: "search.count", label: "Searches", value: count("search") }, { key: "search.zero_results", label: "Zero Result Searches", value: analytics.filter((e) => e.name === "search" && this.number(e.payload, "results_count") === 0).length }];
        case "lead": return [{ key: "contact.count", label: "Contact Forms", value: count("contact_submit") }, { key: "newsletter.count", label: "Newsletter Subscriptions", value: count("newsletter_subscribe") }];
      }
    })();
    const grouped = new Map<string, number>(); for (const e of analytics) grouped.set(e.name, (grouped.get(e.name) ?? 0) + 1);
    return { request_id: requestId, kind, generated_at: new Date().toISOString(), period, metrics: metrics.map((m) => ({ ...m, payload: null })), series: [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value, payload: null })) };
  }
  async recordOutboxProcessed(id: number, requestId: string): Promise<OutboxEvent> {
    const current = await this.db.outboxEvent.findUnique({ where: { id } }); if (!current) throw new NotFoundException("Outbox 事件不存在");
    const row = await this.db.outboxEvent.update({ where: { id }, data: { status: "processed", processedAt: new Date(), attempts: current.attempts + 1, requestId } } as any);
    await this.recordAudit({ actor_id: 1, action: "outbox.process", entity: "outbox_event", entity_id: id, before: this.outboxDto(current), after: this.outboxDto(row), ip: null, request_id: requestId });
    return this.outboxDto(row);
  }
}
