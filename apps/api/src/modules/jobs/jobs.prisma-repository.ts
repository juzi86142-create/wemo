import { Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { JOBS_REPOSITORY, type JobsRepository } from "./jobs.repository";
import type { JobDefinition, JobExecution } from "@wemo/contracts";

@Injectable()
export class JobsPrismaRepository implements JobsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listDefinitions(): Promise<JobDefinition[]> {
    const jobs = await this.database.jobDefinition.findMany({
      where: { status: "active" },
    });

    return jobs.map(j => this.mapDefinition(j));
  }

  async getDefinition(id: number): Promise<JobDefinition | null> {
    const job = await this.database.jobDefinition.findUnique({
      where: { id },
    });

    return job ? this.mapDefinition(job) : null;
  }

  async createDefinition(input: any): Promise<JobDefinition> {
    const job = await this.database.jobDefinition.create({
      data: {
        name: input.name,
        description: input.description,
        schedule: input.schedule,
        handler: input.handler,
        status: "active",
        config: input.config || {},
      },
    });

    return this.mapDefinition(job);
  }

  async triggerExecution(jobId: number): Promise<JobExecution> {
    const execution = await this.database.jobExecution.create({
      data: {
        jobId,
        status: "running",
        startedAt: new Date(),
      },
    });

    return this.mapExecution(execution);
  }

  async listExecutions(query: any): Promise<{ items: JobExecution[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.job_id) where.jobId = query.job_id;
    if (query.status) where.status = query.status;

    const [executions, total] = await Promise.all([
      this.database.jobExecution.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.jobExecution.count({ where }),
    ]);

    return {
      items: executions.map(e => this.mapExecution(e)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async updateExecutionStatus(executionId: number, status: string, output?: any): Promise<JobExecution> {
    const execution = await this.database.jobExecution.update({
      where: { id: executionId },
      data: {
        status,
        output,
        completedAt: status === "completed" || status === "failed" ? new Date() : undefined,
      },
    });

    return this.mapExecution(execution);
  }

  private mapDefinition(job: any): JobDefinition {
    return {
      id: job.id,
      name: job.name,
      description: job.description,
      schedule: job.schedule,
      handler: job.handler,
      status: job.status,
      config: job.config || {},
      created_at: job.createdAt.toISOString(),
      updated_at: job.updatedAt.toISOString(),
    };
  }

  private mapExecution(execution: any): JobExecution {
    return {
      id: execution.id,
      job_id: execution.jobId,
      status: execution.status,
      output: execution.output || {},
      error: execution.error,
      started_at: execution.startedAt?.toISOString() || null,
      completed_at: execution.completedAt?.toISOString() || null,
      created_at: execution.createdAt.toISOString(),
    };
  }
}
