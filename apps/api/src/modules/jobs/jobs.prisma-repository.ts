import { Inject, Injectable } from "@nestjs/common";
import type { JobRun, JobStatus } from "@wemo/contracts/platform";
import type { DatabaseClient } from "@wemo/database";
import { DATABASE_CLIENT } from "../../database/database.constants";

import {
  type JobExecutionPage,
  type JobListQuery,
  type JobsRepository,
} from "./jobs.repository";

const DEMO_JOB_NOT_SUPPORTED = "Demo模式：暂不支持任务持久化与调度";

/**
 * Demo 模式：job_definitions / job_executions 表已从数据库中移除，
 * 定义/执行相关操作一律抛错，仅列表返回空分页。
 */
@Injectable()
export class JobsPrismaRepository implements JobsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listDefinitions(): Promise<JobRun[]> {
    return [];
  }

  async getDefinition(id: number): Promise<JobRun | null> {
    return null;
  }

  async createDefinition(input: unknown): Promise<JobRun> {
    throw new Error(DEMO_JOB_NOT_SUPPORTED);
  }

  async triggerExecution(jobId: number): Promise<JobRun> {
    throw new Error(DEMO_JOB_NOT_SUPPORTED);
  }

  async listExecutions(query: JobListQuery): Promise<JobExecutionPage> {
    return { items: [], total: 0, page: query.page, page_size: query.page_size };
  }

  async updateExecutionStatus(
    executionId: number,
    status: JobStatus,
    output?: unknown,
  ): Promise<JobRun> {
    throw new Error(DEMO_JOB_NOT_SUPPORTED);
  }
}
