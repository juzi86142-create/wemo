import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  type AnalyticsEventInput,
  type AnalyticsEventRecord,
  type AuditLog,
  type AuditLogQuery,
  type IntegrationAdapter,
  type IntegrationKind,
  type JobKind,
  type JobRun,
  type JobStatus,
  type OutboxEvent,
  type OutboxStatus,
  type PlatformSetting,
  type PlatformSettingsSnapshot,
  type ReportKind,
  type ReportSnapshot,
  type RequestContext,
  type WebhookDelivery,
  type WebhookDeliveryStatus,
  type WebhookIngest,
} from "@wemo/contracts/platform";
import { type JsonValue } from "@wemo/contracts/common";

type QueryPage = {
  page?: number;
  page_size?: number;
};

type ListResult<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

type JobAttempt = JobRun["attempts_history"][number];

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeVersion(version: string): string {
  const parsed = Number.parseInt(version, 10);
  return Number.isFinite(parsed) ? String(parsed + 1) : `${version}.1`;
}

function paginate<T>(items: T[], page = 1, pageSize = 20): ListResult<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize).map((item) => clone(item)),
    page,
    page_size: pageSize,
    total: items.length,
  };
}

function withinRange(iso: string, from?: string, to?: string): boolean {
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

function getNumber(value: JsonValue, key: string): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = (value as Record<string, JsonValue>)[key];
  if (typeof candidate === "number") return candidate;
  if (typeof candidate === "string" && candidate.trim()) {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getString(value: JsonValue, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = (value as Record<string, JsonValue>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

@Injectable()
export class PlatformStateStore {
  private settingSeq = 1;
  private auditSeq = 1;
  private outboxSeq = 1;
  private jobSeq = 1;
  private integrationSeq = 1;
  private deliverySeq = 1;
  private analyticsSeq = 1;

  private readonly settings: PlatformSetting[] = [
    {
      id: this.settingSeq++,
      group_name: "platform",
      key: "default_market",
      value: "global",
      version: "1",
      updated_by: 1,
      updated_at: nowIso(),
      is_sensitive: false,
    },
    {
      id: this.settingSeq++,
      group_name: "platform",
      key: "default_locale",
      value: "en-US",
      version: "1",
      updated_by: 1,
      updated_at: nowIso(),
      is_sensitive: false,
    },
    {
      id: this.settingSeq++,
      group_name: "jobs",
      key: "max_attempts",
      value: 3,
      version: "1",
      updated_by: 1,
      updated_at: nowIso(),
      is_sensitive: false,
    },
    {
      id: this.settingSeq++,
      group_name: "integrations",
      key: "webhook_signature_mode",
      value: "demo",
      version: "1",
      updated_by: 1,
      updated_at: nowIso(),
      is_sensitive: false,
    },
  ];

  private readonly auditLogs: AuditLog[] = [];
  private readonly outboxEvents: OutboxEvent[] = [];
  private readonly jobs: JobRun[] = [];
  private readonly integrations: IntegrationAdapter[] = [
    {
      id: this.integrationSeq++,
      code: "mailpit",
      kind: "mail",
      provider: "mailpit",
      status: "healthy",
      last_checked_at: nowIso(),
      last_error: null,
      capabilities: ["send", "track"],
      metadata: { endpoint: "http://localhost:1025" },
    },
    {
      id: this.integrationSeq++,
      code: "postgres-search",
      kind: "search",
      provider: "postgres",
      status: "healthy",
      last_checked_at: nowIso(),
      last_error: null,
      capabilities: ["query", "index"],
      metadata: { engine: "fts" },
    },
    {
      id: this.integrationSeq++,
      code: "minio",
      kind: "storage",
      provider: "minio",
      status: "healthy",
      last_checked_at: nowIso(),
      last_error: null,
      capabilities: ["upload", "download", "signed-url"],
      metadata: { bucket: "wemove-local" },
    },
  ];
  private readonly deliveries: WebhookDelivery[] = [];
  private readonly analytics: AnalyticsEventRecord[] = [];

  private readonly jobAttempts: Map<number, JobRun["attempts_history"]> = new Map();
  private readonly jobIdempotencyIndex: Map<string, number> = new Map();
  private readonly deliveryIdempotencyIndex: Map<string, number> = new Map();
  private readonly analyticsIdempotencyIndex: Map<string, number> = new Map();

  snapshotSettings(requestId: string): PlatformSettingsSnapshot {
    const groups = new Map<string, PlatformSetting[]>();
    for (const setting of this.settings) {
      const items = groups.get(setting.group_name) ?? [];
      items.push(clone(setting));
      groups.set(setting.group_name, items);
    }

    return {
      request_id: requestId,
      generated_at: nowIso(),
      groups: [...groups.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([group_name, items]) => ({
          group_name,
          items: items.sort((a, b) => a.key.localeCompare(b.key)),
        })),
    };
  }

  listSettings(): PlatformSetting[] {
    return this.settings
      .slice()
      .sort((left, right) =>
        `${left.group_name}.${left.key}`.localeCompare(
          `${right.group_name}.${right.key}`,
        ),
      )
      .map((setting) => clone(setting));
  }

  upsertSetting(
    input: {
      group_name: string;
      key: string;
      value: JsonValue;
      expected_version?: string | undefined;
      is_sensitive?: boolean | undefined;
    },
    context: RequestContext,
  ): PlatformSetting {
    const existingIndex = this.settings.findIndex(
      (setting) =>
        setting.group_name === input.group_name && setting.key === input.key,
    );
    const existing = existingIndex >= 0 ? this.settings[existingIndex] : null;

    if (existing && input.expected_version && existing.version !== input.expected_version) {
      throw new ConflictException("设置版本已变化，请刷新后重试");
    }

    const updated: PlatformSetting = {
      id: existing?.id ?? this.settingSeq++,
      group_name: input.group_name,
      key: input.key,
      value: clone(input.value),
      version: existing ? normalizeVersion(existing.version) : "1",
      updated_by: context.actor?.user_id ?? 1,
      updated_at: nowIso(),
      is_sensitive: input.is_sensitive ?? existing?.is_sensitive ?? false,
    };

    if (existingIndex >= 0) {
      this.settings[existingIndex] = updated;
    } else {
      this.settings.push(updated);
    }

    this.recordAudit({
      actor_id: context.actor?.user_id ?? 1,
      action: existing ? "settings.update" : "settings.create",
      entity: "system_setting",
      entity_id: updated.id,
      before: existing ? clone(existing) : null,
      after: clone(updated),
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    this.enqueueOutbox({
      topic: existing ? "settings.updated" : "settings.created",
      aggregate_id: updated.id,
      payload: {
        group_name: updated.group_name,
        key: updated.key,
        version: updated.version,
      },
      request_id: context.request_id,
    });

    return clone(updated);
  }

  listAuditLogs(query: AuditLogQuery): ListResult<AuditLog> {
    const filtered = this.auditLogs.filter((entry) => {
      if (query.entity && entry.entity !== query.entity) return false;
      if (query.action && entry.action !== query.action) return false;
      if (query.actor_id && entry.actor_id !== query.actor_id) return false;
      if (query.request_id && entry.request_id !== query.request_id) return false;
      return true;
    });

    return paginate(filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)), query.page, query.page_size);
  }

  recordAudit(input: {
    actor_id: number;
    action: string;
    entity: string;
    entity_id: number;
    before: unknown;
    after: unknown;
    ip: string | null;
    request_id: string;
  }): AuditLog {
    const entry: AuditLog = {
      id: this.auditSeq++,
      actor_id: input.actor_id,
      action: input.action,
      entity: input.entity,
      entity_id: input.entity_id,
      before: input.before as JsonValue | null,
      after: input.after as JsonValue | null,
      ip: input.ip,
      request_id: input.request_id,
      created_at: nowIso(),
    };
    this.auditLogs.push(entry);
    return clone(entry);
  }

  enqueueOutbox(input: {
    topic: string;
    aggregate_id: number;
    payload: JsonValue;
    request_id: string;
    available_at?: string | undefined;
  }): OutboxEvent {
    const entry: OutboxEvent = {
      id: this.outboxSeq++,
      topic: input.topic,
      aggregate_id: input.aggregate_id,
      payload: clone(input.payload),
      status: "pending",
      available_at: input.available_at ?? nowIso(),
      processed_at: null,
      request_id: input.request_id,
      attempts: 0,
      created_at: nowIso(),
    };
    this.outboxEvents.push(entry);
    return clone(entry);
  }

  listOutboxEvents(query: {
    status?: OutboxStatus | undefined;
    topic?: string | undefined;
    request_id?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): ListResult<OutboxEvent> {
    const filtered = this.outboxEvents.filter((entry) => {
      if (query.status && entry.status !== query.status) return false;
      if (query.topic && entry.topic !== query.topic) return false;
      if (query.request_id && entry.request_id !== query.request_id) return false;
      return true;
    });

    return paginate(filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)), query.page, query.page_size);
  }

  createJobRun(input: {
    kind: JobKind;
    payload: JsonValue;
    idempotency_key: string;
    max_attempts: number;
    request_id: string;
    actor_id: number | null;
    company_id: number | null;
  }): JobRun {
    const existingId = this.jobIdempotencyIndex.get(input.idempotency_key);
    if (existingId) {
      const existing = this.jobs.find((job) => job.id === existingId);
      if (existing) return clone(existing);
    }

    const job: JobRun = {
      id: this.jobSeq++,
      kind: input.kind,
      status: "queued",
      idempotency_key: input.idempotency_key,
      request_id: input.request_id,
      actor_id: input.actor_id,
      company_id: input.company_id,
      payload: clone(input.payload),
      progress: 0,
      attempts: 0,
      max_attempts: input.max_attempts,
      failure_reason: null,
      last_error: null,
      next_run_at: nowIso(),
      started_at: null,
      finished_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      attempts_history: [],
    };

    this.jobs.push(job);
    this.jobIdempotencyIndex.set(input.idempotency_key, job.id);
    this.enqueueOutbox({
      topic: "job.created",
      aggregate_id: job.id,
      payload: {
        kind: job.kind,
        idempotency_key: job.idempotency_key,
      },
      request_id: input.request_id,
    });

    return clone(job);
  }

  listJobs(query: {
    kind?: JobKind | undefined;
    status?: JobStatus | undefined;
    request_id?: string | undefined;
    actor_id?: number | undefined;
    created_from?: string | undefined;
    created_to?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): ListResult<JobRun> {
    const filtered = this.jobs.filter((job) => {
      if (query.kind && job.kind !== query.kind) return false;
      if (query.status && job.status !== query.status) return false;
      if (query.request_id && job.request_id !== query.request_id) return false;
      if (query.actor_id && job.actor_id !== query.actor_id) return false;
      if (query.created_from && job.created_at < query.created_from) return false;
      if (query.created_to && job.created_at > query.created_to) return false;
      return true;
    });

    return paginate(filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)), query.page, query.page_size);
  }

  getJob(id: number): JobRun {
    const job = this.jobs.find((entry) => entry.id === id);
    if (!job) {
      throw new NotFoundException("任务不存在");
    }
    return clone(job);
  }

  retryJob(
    id: number,
    requestId: string,
    actorId: number,
    reason?: string,
  ): JobRun {
    const index = this.jobs.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("任务不存在");
    }

    const current = this.jobs[index]!;
    if (current.status === "succeeded") {
      throw new ConflictException("已成功的任务不能重试");
    }

    const attemptNo = current.attempts + 1;
    const attempt = {
      attempt_no: attemptNo,
      status: "retrying" as const,
      started_at: nowIso(),
      finished_at: null,
      failure_reason: reason ?? null,
      request_id: requestId,
    };
    const attempts = [...current.attempts_history, attempt];
    const next: JobRun = {
      ...current,
      status: "retrying",
      attempts: attemptNo,
      next_run_at: nowIso(),
      started_at: current.started_at ?? nowIso(),
      failure_reason: reason ?? current.failure_reason,
      updated_at: nowIso(),
      attempts_history: attempts,
    };

    this.jobs[index] = next;
    this.recordAudit({
      actor_id: actorId,
      action: "job.retry",
      entity: "job_run",
      entity_id: next.id,
      before: clone(current),
      after: clone(next),
      ip: null,
      request_id: requestId,
    });
    return clone(next);
  }

  completeJob(id: number, requestId: string, actorId: number, result: JsonValue): JobRun {
    const index = this.jobs.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("任务不存在");
    }

    const current = this.jobs[index]!;
    const next: JobRun = {
      ...current,
      status: "succeeded",
      progress: 100,
      finished_at: nowIso(),
      updated_at: nowIso(),
      failure_reason: null,
      last_error: null,
      attempts_history: current.attempts_history.map(
        (attempt: JobAttempt, attemptIndex: number) =>
          attemptIndex === current.attempts_history.length - 1
            ? {
                ...attempt,
                status: "succeeded",
                finished_at: nowIso(),
              }
            : attempt,
      ),
      payload: current.payload,
    };

    this.jobs[index] = next;
    this.enqueueOutbox({
      topic: "job.completed",
      aggregate_id: next.id,
      payload: result,
      request_id: requestId,
    });
    this.recordAudit({
      actor_id: actorId,
      action: "job.complete",
      entity: "job_run",
      entity_id: next.id,
      before: clone(current),
      after: clone(next),
      ip: null,
      request_id: requestId,
    });
    return clone(next);
  }

  failJob(
    id: number,
    requestId: string,
    actorId: number,
    reason: string,
    lastError?: JsonValue,
  ): JobRun {
    const index = this.jobs.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("任务不存在");
    }

    const current = this.jobs[index]!;
    const next: JobRun = {
      ...current,
      status: "failed",
      updated_at: nowIso(),
      failure_reason: reason,
      last_error: lastError ?? current.last_error,
      finished_at: nowIso(),
      attempts_history: current.attempts_history.map(
        (attempt: JobAttempt, attemptIndex: number) =>
          attemptIndex === current.attempts_history.length - 1
            ? {
                ...attempt,
                status: "failed",
                finished_at: nowIso(),
                failure_reason: reason,
              }
            : attempt,
      ),
    };

    this.jobs[index] = next;
    this.recordAudit({
      actor_id: actorId,
      action: "job.fail",
      entity: "job_run",
      entity_id: next.id,
      before: clone(current),
      after: clone(next),
      ip: null,
      request_id: requestId,
    });
    return clone(next);
  }

  listIntegrations(): ListResult<IntegrationAdapter> {
    return paginate(
      this.integrations.slice().sort((left, right) => left.provider.localeCompare(right.provider)),
      1,
      this.integrations.length || 20,
    );
  }

  listDeliveries(query: {
    provider?: string | undefined;
    status?: WebhookDeliveryStatus | undefined;
    request_id?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): ListResult<WebhookDelivery> {
    const filtered = this.deliveries.filter((delivery) => {
      if (query.provider && delivery.provider !== query.provider) return false;
      if (query.status && delivery.status !== query.status) return false;
      if (query.request_id && delivery.request_id !== query.request_id) return false;
      return true;
    });

    return paginate(filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)), query.page, query.page_size);
  }

  recordWebhookDelivery(input: {
    provider: string;
    integration_kind?: IntegrationKind | undefined;
    request_id: string;
    actor_id: number | null;
    signature: string | null;
    signature_version?: string | undefined;
    ingest: WebhookIngest;
    verified: boolean;
    response?: JsonValue | undefined;
  }): WebhookDelivery {
    const dedupeKey = `${input.provider}:${input.ingest.idempotency_key}`;
    const existingId = this.deliveryIdempotencyIndex.get(dedupeKey);
    if (existingId) {
      const existing = this.deliveries.find((delivery) => delivery.id === existingId);
      if (existing) {
        return clone({
          ...existing,
          status: "duplicate",
          attempt_count: existing.attempt_count + 1,
          updated_at: nowIso(),
        });
      }
    }

    const integration =
      this.integrations.find((entry) => entry.provider === input.provider) ??
      this.registerIntegration({
        provider: input.provider,
        kind: input.integration_kind ?? "webhook",
        capabilities: ["webhook"],
      });

    const status: WebhookDeliveryStatus = input.verified
      ? "accepted"
      : "rejected";
    const delivery: WebhookDelivery = {
      id: this.deliverySeq++,
      integration_id: integration.id,
      provider: input.provider,
      event: input.ingest.event,
      status,
      idempotency_key: input.ingest.idempotency_key,
      request_id: input.request_id,
      attempt_count: 1,
      failure_reason: input.verified ? null : "签名校验失败",
      payload: clone(input.ingest.payload),
      response: input.response ? clone(input.response) : null,
      created_at: nowIso(),
      updated_at: nowIso(),
      completed_at: input.verified ? nowIso() : null,
    };

    this.deliveries.push(delivery);
    this.deliveryIdempotencyIndex.set(dedupeKey, delivery.id);

    this.recordAudit({
      actor_id: input.actor_id ?? 1,
      action: "integration.webhook",
      entity: "integration_delivery",
      entity_id: delivery.id,
      before: null,
      after: clone(delivery),
      ip: null,
      request_id: input.request_id,
    });

    return clone(delivery);
  }

  registerIntegration(input: {
    provider: string;
    kind: IntegrationKind;
    capabilities?: string[] | undefined;
  }): IntegrationAdapter {
    const existing = this.integrations.find(
      (entry) => entry.provider === input.provider && entry.kind === input.kind,
    );
    if (existing) {
      return clone(existing);
    }

    const adapter: IntegrationAdapter = {
      id: this.integrationSeq++,
      code: `${input.kind}:${input.provider}`.replaceAll(" ", "-"),
      kind: input.kind,
      provider: input.provider,
      status: "healthy",
      last_checked_at: nowIso(),
      last_error: null,
      capabilities: input.capabilities ?? [],
      metadata: {},
    };

    this.integrations.push(adapter);
    return clone(adapter);
  }

  recordAnalyticsEvents(
    events: AnalyticsEventInput[],
    context: RequestContext,
  ): { accepted: AnalyticsEventRecord[]; deduplicated: number } {
    const accepted: AnalyticsEventRecord[] = [];
    let deduplicated = 0;

    for (const [index, event] of events.entries()) {
      const dedupeKey = event.dedupe_key ?? `${context.request_id}:${event.name}:${index}`;
      const existingId = this.analyticsIdempotencyIndex.get(dedupeKey);
      if (existingId) {
        const existing = this.analytics.find(
          (entry) => entry.id === existingId,
        );
        if (existing) {
          accepted.push(clone(existing));
          deduplicated += 1;
          continue;
        }
      }

      const record: AnalyticsEventRecord = {
        id: this.analyticsSeq++,
        name: event.name,
        request_id: context.request_id,
        user_id: context.actor?.user_id ?? null,
        company_id: context.actor?.company_id ?? null,
        market: event.market ?? context.market ?? null,
        locale: event.locale ?? context.locale ?? null,
        device: event.device ?? null,
        role: event.role ?? context.actor?.audience ?? null,
        payload: clone(event.payload),
        dedupe_key: event.dedupe_key ?? null,
        occurred_at: nowIso(),
      };

      this.analytics.push(record);
      this.analyticsIdempotencyIndex.set(dedupeKey, record.id);
      accepted.push(clone(record));
    }

    this.enqueueOutbox({
      topic: "analytics.recorded",
      aggregate_id: accepted[0]?.id ?? this.analyticsSeq,
      payload: {
        accepted: accepted.length,
        deduplicated,
      },
      request_id: context.request_id,
    });

    return { accepted, deduplicated };
  }

  listAnalyticsEvents(query: {
    name?: string | undefined;
    request_id?: string | undefined;
    company_id?: number | undefined;
    market?: string | undefined;
    locale?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): ListResult<AnalyticsEventRecord> {
    const filtered = this.analytics.filter((entry) => {
      if (query.name && entry.name !== query.name) return false;
      if (query.request_id && entry.request_id !== query.request_id) return false;
      if (query.company_id && entry.company_id !== query.company_id) return false;
      if (query.market && entry.market !== query.market) return false;
      if (query.locale && entry.locale !== query.locale) return false;
      return true;
    });

    return paginate(filtered.sort((left, right) => right.occurred_at.localeCompare(left.occurred_at)), query.page, query.page_size);
  }

  buildReportSnapshot(
    kind: ReportKind,
    requestId: string,
    period?: { from?: string | undefined; to?: string | undefined } | undefined,
  ): ReportSnapshot {
    const analytics = this.analytics.filter((entry) =>
      withinRange(entry.occurred_at, period?.from, period?.to),
    );
    const counts = new Map<string, number>();
    for (const entry of analytics) {
      counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1);
    }
    const series = [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value, payload: null }));

    const metrics = (() => {
      switch (kind) {
        case "dashboard":
          return [
            {
              key: "settings.count",
              label: "Settings",
              value: this.settings.length,
            },
            {
              key: "audit.count",
              label: "Audit Logs",
              value: this.auditLogs.length,
            },
            {
              key: "jobs.pending",
              label: "Pending Jobs",
              value: this.jobs.filter((job) => job.status === "queued" || job.status === "retrying").length,
            },
            {
              key: "integrations.healthy",
              label: "Healthy Integrations",
              value: this.integrations.filter((integration) => integration.status === "healthy").length,
            },
            {
              key: "analytics.events",
              label: "Analytics Events",
              value: analytics.length,
            },
            {
              key: "outbox.pending",
              label: "Pending Outbox",
              value: this.outboxEvents.filter((event) => event.status === "pending").length,
            },
          ];
        case "sales":
          return [
            {
              key: "purchase.count",
              label: "Purchases",
              value: analytics.filter((entry) => entry.name === "purchase").length,
            },
            {
              key: "purchase.revenue_minor",
              label: "Revenue",
              value: analytics
                .filter((entry) => entry.name === "purchase")
                .reduce((sum, entry) => sum + (getNumber(entry.payload, "revenue_minor") ?? 0), 0),
              unit: "minor",
            },
          ];
        case "product":
          return [
            {
              key: "product.view",
              label: "Product Views",
              value: analytics.filter((entry) => entry.name === "view_product").length,
            },
            {
              key: "cart.add",
              label: "Add To Cart",
              value: analytics.filter((entry) => entry.name === "add_to_cart").length,
            },
            {
              key: "purchase.count",
              label: "Purchases",
              value: analytics.filter((entry) => entry.name === "purchase").length,
            },
          ];
        case "dealer":
          return [
            {
              key: "dealer.apply.submit",
              label: "Dealer Applications",
              value: analytics.filter((entry) => entry.name === "dealer_apply_submit").length,
            },
            {
              key: "quote.request",
              label: "Quote Requests",
              value: analytics.filter((entry) => entry.name === "request_quote").length,
            },
          ];
        case "content":
          return [
            {
              key: "download.count",
              label: "Downloads",
              value: analytics.filter((entry) => entry.name === "download_asset").length,
            },
            {
              key: "home.view",
              label: "Home Views",
              value: analytics.filter((entry) => entry.name === "view_home").length,
            },
          ];
        case "search":
          return [
            {
              key: "search.count",
              label: "Searches",
              value: analytics.filter((entry) => entry.name === "search").length,
            },
            {
              key: "search.zero_results",
              label: "Zero Result Searches",
              value: analytics.filter(
                (entry) =>
                  entry.name === "search" &&
                  (getNumber(entry.payload, "results_count") ?? 1) === 0,
              ).length,
            },
          ];
        case "lead":
          return [
            {
              key: "contact.count",
              label: "Contact Forms",
              value: analytics.filter((entry) => entry.name === "contact_submit").length,
            },
            {
              key: "newsletter.count",
              label: "Newsletter Subscriptions",
              value: analytics.filter((entry) => entry.name === "newsletter_subscribe").length,
            },
          ];
      }
    })();

    const normalizedMetrics = metrics.map((metric) => ({
      ...metric,
      payload: null,
    }));
    const normalizedSeries = series.map((point) => ({
      ...point,
      payload: null,
    }));

    return {
      request_id: requestId,
      kind,
      generated_at: nowIso(),
      period,
      metrics: normalizedMetrics,
      series: normalizedSeries,
    };
  }

  recordOutboxProcessed(id: number, requestId: string): OutboxEvent {
    const index = this.outboxEvents.findIndex((event) => event.id === id);
    if (index < 0) {
      throw new NotFoundException("Outbox 事件不存在");
    }

    const current = this.outboxEvents[index]!;
    const next: OutboxEvent = {
      ...current,
      status: "processed",
      processed_at: nowIso(),
      attempts: current.attempts + 1,
    };
    this.outboxEvents[index] = next;

    const before = {
      ...current,
      failure_reason: current.failure_reason ?? null,
    };
    const after = {
      ...next,
      failure_reason: next.failure_reason ?? null,
    };

    this.recordAudit({
      actor_id: 1,
      action: "outbox.process",
      entity: "outbox_event",
      entity_id: next.id,
      before: clone(before),
      after: clone(after),
      ip: null,
      request_id: requestId,
    });

    return clone(next);
  }
}
