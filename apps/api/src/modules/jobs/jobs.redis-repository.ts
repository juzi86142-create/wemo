import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { JobRun, JobStatus } from "@wemo/contracts/platform";
import { randomUUID } from "node:crypto";

import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import {
  JOBS_REPOSITORY,
  type JobExecutionPage,
  type JobListQuery,
  type JobsRepository,
} from "./jobs.repository";

const RUNS_KEY = `${REDIS_KEY_PREFIX}:jobs:runs`;

/** 异步作业运行记录持久化在 Redis hash 执行历史内嵌 attempts_history */
@Injectable()
export class JobsRedisRepository implements JobsRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** 列出全部作业运行记录 */
  async listDefinitions(): Promise<JobRun[]> {
    const raw = await this.redis.hgetall(RUNS_KEY);
    return Object.entries(raw)
      .map(([, value]) => JSON.parse(value) as JobRun)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /** 按 id 查询作业运行记录 */
  async getDefinition(id: number): Promise<JobRun | null> {
    const raw = await this.redis.hget(RUNS_KEY, String(id));
    return raw ? (JSON.parse(raw) as JobRun) : null;
  }

  /** 创建新的作业运行记录 初始状态 queued */
  async createDefinition(input: {
    kind?: JobRun["kind"];
    payload?: unknown;
    idempotency_key?: string;
    max_attempts?: number;
  }): Promise<JobRun> {
    const now = new Date().toISOString();
    const run: JobRun = {
      id: await this.redis.incr(`${REDIS_KEY_PREFIX}:jobs:next`),
      kind: (input.kind ?? "settings") as JobRun["kind"],
      status: "queued",
      idempotency_key: input.idempotency_key ?? randomUUID(),
      request_id: randomUUID(),
      actor_id: null,
      company_id: null,
      payload: (input.payload ?? {}) as JobRun["payload"],
      progress: 0,
      attempts: 0,
      max_attempts: input.max_attempts ?? 3,
      failure_reason: null,
      last_error: null,
      next_run_at: now,
      started_at: null,
      finished_at: null,
      created_at: now,
      updated_at: now,
      attempts_history: [],
    };
    await this.redis.hset(RUNS_KEY, String(run.id), JSON.stringify(run));
    return run;
  }

  /** 触发作业执行 状态转 running 并追加尝试历史 */
  async triggerExecution(jobId: number): Promise<JobRun> {
    const existing = await this.getDefinition(jobId);
    if (!existing) {
      throw new NotFoundException(`作业 ${jobId} 不存在`);
    }
    const now = new Date().toISOString();
    const updated: JobRun = {
      ...existing,
      status: "running",
      attempts: existing.attempts + 1,
      started_at: now,
      updated_at: now,
      attempts_history: [
        ...existing.attempts_history,
        {
          attempt_no: existing.attempts + 1,
          status: "running",
          started_at: now,
          finished_at: null,
          failure_reason: null,
          request_id: randomUUID(),
        },
      ],
    };
    await this.redis.hset(RUNS_KEY, String(jobId), JSON.stringify(updated));
    return updated;
  }

  /** 按类型 状态 请求号 执行人过滤分页查询执行记录 */
  async listExecutions(query: JobListQuery): Promise<JobExecutionPage> {
    const raw = await this.redis.hgetall(RUNS_KEY);
    let runs = Object.entries(raw)
      .map(([, value]) => JSON.parse(value) as JobRun)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (query.kind !== undefined)
      runs = runs.filter((r) => r.kind === query.kind);
    if (query.status !== undefined)
      runs = runs.filter((r) => r.status === query.status);
    if (query.request_id !== undefined)
      runs = runs.filter((r) => r.request_id === query.request_id);
    if (query.actor_id !== undefined)
      runs = runs.filter((r) => r.actor_id === query.actor_id);

    const start = (query.page - 1) * query.page_size;
    return {
      items: runs.slice(start, start + query.page_size),
      total: runs.length,
      page: query.page,
      page_size: query.page_size,
    };
  }

  /** 更新执行状态 终态写入完成时间与失败原因 */
  async updateExecutionStatus(
    executionId: number,
    status: JobStatus,
    output?: unknown,
  ): Promise<JobRun> {
    const existing = await this.getDefinition(executionId);
    if (!existing) {
      throw new NotFoundException(`作业执行 ${executionId} 不存在`);
    }
    const now = new Date().toISOString();
    const finished =
      status === "succeeded" || status === "failed" || status === "cancelled";
    const history = [...existing.attempts_history];
    const lastAttempt = history[history.length - 1];
    if (lastAttempt && lastAttempt.status === "running") {
      history[history.length - 1] = {
        ...lastAttempt,
        status,
        finished_at: finished ? now : null,
        failure_reason:
          status === "failed" && output !== undefined ? String(output) : null,
      };
    }

    const updated: JobRun = {
      ...existing,
      status,
      progress: status === "succeeded" ? 100 : existing.progress,
      finished_at: finished ? now : null,
      failure_reason:
        status === "failed" ? String(output ?? "") : existing.failure_reason,
      last_error:
        status === "failed"
          ? ((output as JobRun["last_error"]) ?? null)
          : existing.last_error,
      updated_at: now,
      attempts_history: history,
    };
    await this.redis.hset(
      RUNS_KEY,
      String(executionId),
      JSON.stringify(updated),
    );
    return updated;
  }
}
